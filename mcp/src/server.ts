/**
 * Kiungo MCP server.
 *
 * Lets an AI model (Claude, ChatGPT, Gemini, Grok, or any MCP client) build
 * circuits and robots in Kiungo's Engineering Lab: pick parts, wire them,
 * check the circuit, run the simulation, and export a .kiungo.json file that
 * opens in the Lab (Session menu → Open from file, or drop it on the canvas).
 *
 *   npm start              stdio (Claude Desktop, Claude Code, Gemini CLI, Cursor)
 *   npm run start:http     Streamable HTTP on PORT (default 8787) at /mcp
 *                          (ChatGPT developer mode, xAI API, remote clients)
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync } from "node:fs";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

import {
  LabError,
  SessionStore,
  addPart,
  autowirePart,
  billOfMaterials,
  checkCircuit,
  connectPins,
  createSession,
  describe,
  importSession,
  listControls,
  listParts,
  moveRename,
  partDetail,
  removeItems,
  setInputs,
  simulate,
} from "./lab.js";
import { suggest } from "@/lib/lab/suggest";
import { SESSION_FILE_EXTENSION, sessionFileName, toSessionFile } from "@/lib/lab/session-file";

const VERSION = "0.1.0";

const INSTRUCTIONS = `Kiungo is a robotics and electronics lab. With these tools you build a circuit the way a person does in Kiungo's Engineering Lab, then export it as a .kiungo.json file the user opens in Kiungo to see your build.

Workflow:
1. create_session.
2. add_part for the board first (arduino-uno, arduino-mega, esp32, raspberry-pi-pico, ...), then each peripheral. add_part auto-wires power, ground and signals to the board unless autowire=false.
3. Read the "check" in every result. Fix errors (connect_pins, remove_items, autowire_part) until check.ok is true. Tips such as "Assumed: 220 Ω resistor" are fine.
4. Optionally set_inputs (sensor surroundings, actuator commands, board settings) and simulate to show it working.
5. export_session and give the user the file.

Rules: only parts returned by search_parts can be placed. Refer to parts by node_id or by their label. Pins are named as get_part lists them. The lab runs a built-in default sketch, not custom firmware; describe behavior accordingly.`;

const store = new SessionStore();
const generator = () => `Kiungo MCP server ${VERSION}${clientName ? ` (${clientName})` : ""}`;
let clientName = "";
/** Base URL people can download exported files from (HTTP mode). */
let publicUrl = process.env.KIUNGO_MCP_PUBLIC_URL?.replace(/\/+$/, "") ?? "";

const ok = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });
const fail = (e: unknown) => ({ isError: true, content: [{ type: "text" as const, text: e instanceof LabError || e instanceof Error ? e.message : String(e) }] });
const run = <T,>(fn: () => T) => {
  try {
    return ok(fn());
  } catch (e) {
    return fail(e);
  }
};

const pinRef = z.object({ node: z.string().describe("node_id or label of the part"), pin: z.string().describe("pin id, as get_part lists it (e.g. D9, GND1, TRIG)") });

export function buildServer(): McpServer {
  const server = new McpServer({ name: "kiungo", version: VERSION }, { instructions: INSTRUCTIONS });

  server.server.oninitialized = () => {
    clientName = server.server.getClientVersion()?.name ?? "";
  };

  // ----- parts

  server.registerTool(
    "search_parts",
    {
      title: "Search parts",
      description: "List the parts that can be placed in a Kiungo lab build: boards, sensors, outputs (LEDs, buzzer, servo, DC motor, stepper, relay), displays and radios. Omit query to list all.",
      inputSchema: { query: z.string().optional(), group: z.enum(["boards", "sensors", "outputs", "displays", "radios"]).optional() },
      annotations: { readOnlyHint: true },
    },
    ({ query, group }) => run(() => listParts(query, group)),
  );

  server.registerTool(
    "get_part",
    {
      title: "Get part pins",
      description: "A part's pins: for boards, what each pin can do and the voltage it supplies; for peripherals, what each pin needs. Use the pin ids with connect_pins.",
      inputSchema: { part_id: z.string() },
      annotations: { readOnlyHint: true },
    },
    ({ part_id }) => run(() => partDetail(part_id)),
  );

  server.registerTool(
    "suggest_parts",
    {
      title: "Suggest parts",
      description: "Parts that fit the current build, ranked; with a query, search results ordered by fit with the boards already placed.",
      inputSchema: { session_id: z.string(), query: z.string().optional() },
      annotations: { readOnlyHint: true },
    },
    ({ session_id, query }) =>
      run(() => {
        const s = store.get(session_id);
        const r = suggest(query ?? "", s.nodes, null, 8);
        return { did_you_mean: r.didYouMean, items: r.items.map((i) => ({ part_id: i.part.id, name: i.part.name, reason: i.reason, fit: i.fit })) };
      }),
  );

  // ----- sessions

  server.registerTool(
    "create_session",
    { title: "Create session", description: "Start a new, empty lab build.", inputSchema: { name: z.string().describe("e.g. 'Obstacle-avoiding rover'") } },
    ({ name }) => run(() => describe(store.save(createSession(name)))),
  );

  server.registerTool(
    "list_sessions",
    { title: "List sessions", description: "Builds saved on this server, newest first.", inputSchema: {}, annotations: { readOnlyHint: true } },
    () => run(() => store.list().map((s) => ({ session_id: s.id, name: s.name, parts: s.nodes.length, wires: s.wires.length, updated: s.updatedAt }))),
  );

  server.registerTool(
    "get_session",
    { title: "Get session", description: "The full build: parts with their status, wires, inputs and the circuit check.", inputSchema: { session_id: z.string() }, annotations: { readOnlyHint: true } },
    ({ session_id }) => run(() => describe(store.get(session_id))),
  );

  server.registerTool(
    "import_session",
    {
      title: "Import a .kiungo.json file",
      description: "Load a build the user exported from Kiungo (Session menu → Export as JSON) so you can change it. Pass the file's text.",
      inputSchema: { file_text: z.string() },
    },
    ({ file_text }) =>
      run(() => {
        const { session, warnings } = importSession(file_text);
        return { ...describe(store.save(session)), warnings };
      }),
  );

  server.registerTool(
    "delete_session",
    { title: "Delete session", description: "Delete a build from this server.", inputSchema: { session_id: z.string() }, annotations: { destructiveHint: true } },
    ({ session_id }) =>
      run(() => {
        store.get(session_id);
        store.delete(session_id);
        return { deleted: session_id };
      }),
  );

  // ----- building

  server.registerTool(
    "add_part",
    {
      title: "Add part",
      description: "Place a part. Peripherals are auto-wired to a board (power, ground, signals on free capable pins) unless autowire is false. Returns the new node, the wires added and the circuit check.",
      inputSchema: {
        session_id: z.string(),
        part_id: z.string(),
        label: z.string().optional().describe("Readable name, e.g. 'Left motor'. Must be unique."),
        board: z.string().optional().describe("node_id or label of the board to wire to, when there are several"),
        near: z.string().optional().describe("node_id or label to place it beside"),
        x: z.number().optional(),
        y: z.number().optional(),
        autowire: z.boolean().optional().default(true),
      },
    },
    ({ session_id, part_id, ...opts }) =>
      run(() => {
        const r = addPart(store.get(session_id), part_id, opts);
        const s = store.save(r.session);
        return {
          node: { node_id: r.node.id, label: r.node.label, part_id: r.node.partId },
          wired_to: r.board?.label,
          // Name each end by its own part: autowire can land a pin on a breadboard rail rather than the board.
          wires_added: r.added.map((w) => `${labelIn(s, w.from.node)}.${w.from.pin} → ${labelIn(s, w.to.node)}.${w.to.pin}`),
          not_wired: r.skipped.length ? r.skipped : undefined,
          check: summarize(s),
        };
      }),
  );

  server.registerTool(
    "connect_pins",
    { title: "Connect pins", description: "Add one wire between two pins.", inputSchema: { session_id: z.string(), from: pinRef, to: pinRef } },
    ({ session_id, from, to }) =>
      run(() => {
        const r = connectPins(store.get(session_id), from, to);
        const s = store.save(r.session);
        return { wire_id: r.wire.id, check: summarize(s) };
      }),
  );

  server.registerTool(
    "autowire_part",
    { title: "Autowire part", description: "Wire a placed part to a board the way the Lab's one-click autowire does.", inputSchema: { session_id: z.string(), node: z.string(), board: z.string().optional() } },
    ({ session_id, node, board }) =>
      run(() => {
        const r = autowirePart(store.get(session_id), node, board);
        const s = store.save(r.session);
        return { wired_to: r.board.label, wires_added: r.added.length, not_wired: r.skipped.length ? r.skipped : undefined, check: summarize(s) };
      }),
  );

  server.registerTool(
    "remove_items",
    {
      title: "Remove parts or wires",
      description: "Remove parts (with their wires) and/or individual wires.",
      inputSchema: { session_id: z.string(), nodes: z.array(z.string()).optional(), wire_ids: z.array(z.string()).optional() },
      annotations: { destructiveHint: true },
    },
    ({ session_id, nodes, wire_ids }) =>
      run(() => {
        const r = removeItems(store.get(session_id), nodes, wire_ids);
        const s = store.save(r.session);
        return { removed_parts: r.removed_parts, removed_wires: r.removed_wires, check: summarize(s) };
      }),
  );

  server.registerTool(
    "update_part",
    { title: "Move or rename part", description: "Change a part's label or canvas position (x, y in canvas units).", inputSchema: { session_id: z.string(), node: z.string(), label: z.string().optional(), x: z.number().optional(), y: z.number().optional() } },
    ({ session_id, node, ...patch }) => run(() => describe(store.save(moveRename(store.get(session_id), node, patch))).parts),
  );

  // ----- checking and running

  server.registerTool(
    "check_circuit",
    { title: "Check circuit", description: "Kiungo's circuit analysis: errors (missing ground, voltage mismatch, shorts), warnings and tips, plus each part's status.", inputSchema: { session_id: z.string() }, annotations: { readOnlyHint: true } },
    ({ session_id }) => run(() => checkCircuit(store.get(session_id))),
  );

  server.registerTool(
    "get_controls",
    { title: "Get controls", description: "The inputs a part takes in the lab: a sensor's surroundings, an actuator's command, or a board's sketch settings (e.g. warning distance).", inputSchema: { session_id: z.string(), node: z.string() }, annotations: { readOnlyHint: true } },
    ({ session_id, node }) => run(() => listControls(store.get(session_id), node)),
  );

  server.registerTool(
    "set_inputs",
    {
      title: "Set inputs",
      description: "Set a part's controls (keys from get_controls), e.g. {distanceCm: 12} on an HC-SR04, {angle: 45} on a servo, {warnCm: 25} on a board.",
      inputSchema: { session_id: z.string(), node: z.string(), values: z.record(z.union([z.number(), z.string(), z.boolean()])) },
    },
    ({ session_id, node, values }) =>
      run(() => {
        const r = setInputs(store.get(session_id), node, values);
        store.save(r.session);
        return { accepted: r.accepted, rejected: r.rejected.length ? r.rejected : undefined };
      }),
  );

  server.registerTool(
    "simulate",
    {
      title: "Simulate",
      description: "Run the build in Kiungo's simulator and sample every part's state (on/off, level, angle, readings, display text) over time.",
      inputSchema: { session_id: z.string(), seconds: z.number().default(4), samples: z.number().int().default(4) },
      annotations: { readOnlyHint: true },
    },
    ({ session_id, seconds, samples }) => run(() => simulate(store.get(session_id), seconds, samples)),
  );

  server.registerTool(
    "bill_of_materials",
    { title: "Bill of materials", description: "Parts list with quantities for the build.", inputSchema: { session_id: z.string() }, annotations: { readOnlyHint: true } },
    ({ session_id }) => run(() => billOfMaterials(store.get(session_id))),
  );

  // ----- export

  server.registerTool(
    "export_session",
    {
      title: "Export .kiungo.json",
      description: "Write the build as a .kiungo.json file. The user opens it in Kiungo's Engineering Lab (Session menu → Open from file, or drag it onto the canvas). Returns the file name, where it was saved, and its full text so you can hand the file to the user.",
      inputSchema: { session_id: z.string() },
      annotations: { readOnlyHint: true },
    },
    ({ session_id }) =>
      run(() => {
        const s = store.get(session_id);
        const { path, fileName, file } = store.writeExport(s, generator());
        const check = checkCircuit(s);
        const download_url = publicUrl ? `${publicUrl}/files/${s.id}${SESSION_FILE_EXTENSION}` : undefined;
        return { file_name: fileName, ...(download_url ? { download_url } : { saved_to: path }), open_in_kiungo: "Engineering Lab → Session menu → Open from file (or drop the file on the canvas)", check: { ok: check.ok, errors: check.errors }, file_text: JSON.stringify(file) };
      }),
  );

  // ----- resources

  server.registerResource("parts", "kiungo://parts", { title: "Kiungo lab parts", mimeType: "application/json", description: "Every part that can be placed in a lab build." }, (uri) => ({
    contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(listParts(), null, 2) }],
  }));
  server.registerResource(
    "part-pinout",
    new ResourceTemplate("kiungo://parts/{part_id}", { list: undefined }),
    { title: "Part pinout", mimeType: "application/json" },
    (uri, { part_id }) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(partDetail(String(part_id)), null, 2) }] }),
  );
  server.registerResource(
    "session-file",
    new ResourceTemplate("kiungo://sessions/{session_id}.kiungo.json", { list: () => ({ resources: store.list().map((s) => ({ uri: `kiungo://sessions/${s.id}.kiungo.json`, name: s.name, mimeType: "application/json" })) }) }),
    { title: "Lab session file", mimeType: "application/json" },
    (uri, { session_id }) => {
      const s = store.get(String(session_id));
      return { contents: [{ uri: uri.href, mimeType: "application/json", text: readFileSync(store.writeExport(s, generator()).path, "utf8") }] };
    },
  );

  // ----- prompts

  server.registerPrompt(
    "build_robot",
    { title: "Build a robot in Kiungo", description: "Design, check, simulate and export a robotics build.", argsSchema: { idea: z.string().describe("What the robot should do") } },
    ({ idea }) => ({
      messages: [{ role: "user", content: { type: "text", text: `Build this in Kiungo's Engineering Lab: ${idea}\n\nChoose a suitable board, add and wire every part, fix all circuit errors, set sensible inputs, simulate it to confirm the behavior, then export the .kiungo.json file and summarize the build (parts, key wiring, how it behaves).` } }],
    }),
  );

  return server;
}

function labelIn(s: ReturnType<typeof store.get>, nodeId: string): string {
  return s.nodes.find((n) => n.id === nodeId)?.label ?? nodeId;
}

function summarize(s: ReturnType<typeof store.get>) {
  const c = checkCircuit(s);
  return { ok: c.ok, errors: c.faults.filter((f) => f.severity === "error").map((f) => `${f.title}: ${f.detail} [${f.parts.join(", ")}]`), warnings: c.faults.filter((f) => f.severity === "warning").map((f) => `${f.title} [${f.parts.join(", ")}]`), tips: c.tips };
}

// ---------------------------------------------------------------- transports

async function main() {
  if (process.argv.includes("--http")) {
    const port = Number(process.env.PORT ?? 8787);
    publicUrl ||= `http://localhost:${port}`;
    const http = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      if (req.url === "/health") return void res.writeHead(200, { "content-type": "application/json" }).end('{"status":"ok"}');
      // Download an exported build: /files/<session_id>.kiungo.json
      const dl = req.method === "GET" ? /^\/files\/([\w-]+)\.kiungo\.json$/.exec(req.url ?? "") : null;
      if (dl) {
        try {
          const session = store.get(dl[1]);
          return void res
            .writeHead(200, { "content-type": "application/json", "content-disposition": `attachment; filename="${sessionFileName(session)}"`, "access-control-allow-origin": "*" })
            .end(JSON.stringify(toSessionFile(session, generator()), null, 2));
        } catch {
          return void res.writeHead(404).end();
        }
      }
      if (!req.url?.startsWith("/mcp")) return void res.writeHead(404).end();
      // Stateless: a fresh server and transport per request; builds persist in the session store.
      const server = buildServer();
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
      res.on("close", () => {
        void transport.close();
        void server.close();
      });
      await server.connect(transport);
      let body = "";
      for await (const chunk of req) body += chunk;
      await transport.handleRequest(req, res, body ? JSON.parse(body) : undefined);
    });
    http.listen(port, () => console.error(`Kiungo MCP server on http://localhost:${port}/mcp (data: ${store.dir})`));
  } else {
    await buildServer().connect(new StdioServerTransport());
    console.error(`Kiungo MCP server on stdio (data: ${store.dir})`);
  }
}

if (process.argv[1] && /server\.ts$/.test(process.argv[1])) void main();
