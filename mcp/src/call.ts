/**
 * A tiny MCP client: start the Kiungo MCP server over stdio, call one tool,
 * print the result. Lets a person (or an agent) drive the server from a shell.
 *
 *   npm run call -- list                      list the tools
 *   npm run call -- <tool> '<json arguments>'
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const [tool, args = "{}"] = process.argv.slice(2);
const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["--import", "tsx", join(here, "server.ts")],
  cwd: join(here, ".."),
  env: { ...process.env, TSX_TSCONFIG_PATH: join(here, "..", "tsconfig.json") } as Record<string, string>,
  stderr: "ignore",
});
const client = new Client({ name: process.env.KIUNGO_CLIENT_NAME ?? "kiungo-cli", version: "0.1.0" });
await client.connect(transport);
try {
  if (!tool || tool === "list") {
    const { tools } = await client.listTools();
    for (const t of tools) console.log(`${t.name.padEnd(18)} ${t.description?.split(". ")[0]}`);
  } else {
    const r = await client.callTool({ name: tool, arguments: JSON.parse(args) });
    for (const c of r.content as Array<{ type: string; text?: string }>) console.log(c.text ?? c);
    if (r.isError) process.exitCode = 1;
  }
} finally {
  await client.close();
}
