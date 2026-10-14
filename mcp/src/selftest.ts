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
import { parseSessionFile } from "@/lib/lab/session-file";
import { analyze } from "@/lib/lab/circuit";

const here = dirname(fileURLToPath(import.meta.url));
const data = mkdtempSync(join(tmpdir(), "kiungo-mcp-"));
const client = new Client({ name: "kiungo-selftest", version: "0.1.0" });
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
} finally {
  await client.close();
  rmSync(data, { recursive: true, force: true });
}
console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
process.exit(failed ? 1 : 0);
