/**
 * End-to-end check over a real MCP connection: build a small robot, fix
 * nothing by hand, export it, and read the file back the way the Lab does.
 *
 *   npm test
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseSessionFile } from "@kiungo/core/lab/session-file";
import { analyze } from "@kiungo/core/lab/circuit";

const here = dirname(fileURLToPath(import.meta.url));
const data = mkdtempSync(join(tmpdir(), "kiungo-mcp-"));
const client = new Client({ name: "kiungo-selftest", version: "0.2.0" });
await client.connect(
  new StdioClientTransport({
    command: process.execPath,
    args: ["--import", "tsx", join(here, "server.ts")],
    cwd: join(here, ".."),
    env: { ...process.env, KIUNGO_MCP_DATA: data, TSX_TSCONFIG_PATH: join(here, "..", "tsconfig.json") } as Record<string, string>,
    stderr: "ignore",
  }),
);

async function call<T = Record<string, unknown>>(name: string, args: Record<string, unknown>): Promise<T> {
  const r = await client.callTool({ name, arguments: args });
  const text = (r.content as Array<{ text: string }>)[0].text;
  if (r.isError) throw new Error(`${name}: ${text}`);
  return JSON.parse(text) as T;
}

let failed = 0;
const expect = (what: string, ok: boolean) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) failed++;
};

try {
  const tools = (await client.listTools()).tools.map((t) => t.name);
  expect("lists the build tools", ["create_session", "add_part", "connect_pins", "check_circuit", "simulate", "export_session"].every((t) => tools.includes(t)));

  const s = await call<{ session_id: string }>("create_session", { name: "Selftest gate" });
  await call("add_part", { session_id: s.session_id, part_id: "arduino-uno", label: "Uno" });
  for (const [part_id, label] of [["pir", "Motion"], ["servo", "Gate"], ["buzzer", "Chime"]]) await call("add_part", { session_id: s.session_id, part_id, label });
  const check = await call<{ ok: boolean; errors: number }>("check_circuit", { session_id: s.session_id });
  expect("autowired build has no circuit errors", check.ok && check.errors === 0);

  const bad = await client.callTool({ name: "add_part", arguments: { session_id: s.session_id, part_id: "flux-capacitor" } });
  expect("rejects a part the lab doesn't have", !!bad.isError);

  await call("set_inputs", { session_id: s.session_id, node: "Motion", values: { motion: true } });
  await call("set_inputs", { session_id: s.session_id, node: "Uno", values: { gateOpen: 120 } });
  const sim = await call<{ frames: Array<{ parts: Record<string, { angle?: number }> }> }>("simulate", { session_id: s.session_id, seconds: 2, samples: 2 });
  expect("simulation opens the gate on motion (120°)", sim.frames.at(-1)?.parts.Gate?.angle === 120);

  const exp = await call<{ file_name: string; file_text: string }>("export_session", { session_id: s.session_id });
  const { session, warnings } = parseSessionFile(exp.file_text);
  expect(`exported ${exp.file_name} opens like the Lab opens it`, warnings.length === 0 && session.nodes.length === 4);
  expect("the opened file still has no circuit errors", !analyze(session.nodes, session.wires).faults.some((f) => f.severity === "error"));

  const back = await call<{ part_count: number }>("import_session", { file_text: exp.file_text });
  expect("import_session reads it back", back.part_count === 4);

  // A robot that drives: the driver first, so its motor supply has to move to the battery when one arrives.
  const r = await call<{ session_id: string }>("create_session", { name: "Selftest rover" });
  await call("add_part", { session_id: r.session_id, part_id: "arduino-uno", label: "Uno" });
  const lone = await call<{ hint?: string; wires_added: string[] }>("add_part", { session_id: r.session_id, part_id: "micro-gear-motor", label: "Spare" });
  expect("a motor with no driver is left unwired, with a hint", lone.wires_added.length === 0 && /driver/i.test(lone.hint ?? ""));
  await call("remove_items", { session_id: r.session_id, nodes: ["Spare"] });
  await call("add_part", { session_id: r.session_id, part_id: "tb6612fng", label: "Driver" });
  const battery = await call<{ wired_to?: string; wires_added: string[] }>("add_part", { session_id: r.session_id, part_id: "battery-18650", label: "Battery" });
  expect("a battery goes to the driver waiting for one", battery.wired_to === "Driver" && battery.wires_added.some((w) => w.includes("Driver.VM") && w.includes("Battery.POS")));
  for (const label of ["Left", "Right"]) await call("add_part", { session_id: r.session_id, part_id: "micro-gear-motor", label });
  const rover = await call<{ ok: boolean; errors: number; parts: Array<{ label: string; supply_v: number | null }> }>("check_circuit", { session_id: r.session_id });
  expect("the rover has no circuit errors", rover.ok && rover.errors === 0);
  expect("its motors run from the battery, not the board", ["Left", "Right"].every((label) => rover.parts.find((p) => p.label === label)?.supply_v === 7.4));
  const built = await call<{ file_text: string }>("export_session", { session_id: r.session_id });
  const wires = parseSessionFile(built.file_text).session.wires;
  expect("the driver's motor supply left the board's pin", !wires.some((w) => [w.from.pin, w.to.pin].includes("VM") && [w.from.pin, w.to.pin].includes("VIN")));
  const groups = await call<Array<{ part_id: string }>>("search_parts", { group: "power" });
  expect("search_parts lists the power group", groups.some((p) => p.part_id === "battery-18650"));
} finally {
  await client.close();
  rmSync(data, { recursive: true, force: true });
}
console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
process.exit(failed ? 1 : 0);
