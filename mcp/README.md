# Kiungo MCP server

Lets AI models (Claude, ChatGPT, Gemini, Grok, or any MCP client) build circuits and robots in Kiungo's Engineering Lab, check and simulate them, and hand back a `.kiungo.json` file you open in Kiungo.

It runs the Lab's own code (`lib/lab`, `packages/core/src/parts`), so a build the AI makes is checked by the same circuit analysis, autowire and simulator the browser uses.

## Run it

```bash
cd mcp
npm install
npm test              # end-to-end check over a real MCP connection
npm start             # stdio, for desktop and CLI clients
npm run start:http    # Streamable HTTP on PORT (default 8787) at /mcp
```

Builds are stored as JSON under `KIUNGO_MCP_DATA` (default `mcp/data`). In HTTP mode, exported files download from `/files/<session_id>.kiungo.json`; set `KIUNGO_MCP_PUBLIC_URL` to the server's public address so download links work for remote clients.

## Connect an AI model

Local clients start the server themselves over stdio. Use the absolute path to this folder.

- **Claude Code:** `claude mcp add kiungo -- npx --prefix /path/to/jumetra-frontend/mcp tsx --tsconfig /path/to/jumetra-frontend/mcp/tsconfig.json /path/to/jumetra-frontend/mcp/src/server.ts`
- **Claude Desktop** (`claude_desktop_config.json`) and **Gemini CLI** (`~/.gemini/settings.json`) use the same block:

  ```json
  {
    "mcpServers": {
      "kiungo": {
        "command": "npx",
        "args": ["--prefix", "/path/to/jumetra-frontend/mcp", "tsx", "--tsconfig", "/path/to/jumetra-frontend/mcp/tsconfig.json", "/path/to/jumetra-frontend/mcp/src/server.ts"]
      }
    }
  }
  ```

Remote clients need the HTTP mode on a public HTTPS address (a deployed server, or a tunnel while testing):

- **ChatGPT:** in developer mode, add a custom connector with the URL `https://<your-host>/mcp`.
- **Grok (xAI API):** pass the same URL as a remote MCP tool in the API request.
- **Claude (web):** add it as a custom connector with the same URL.

Platform menus change often; check each vendor's current MCP documentation.

## What the AI can do

| Tool | Does |
| --- | --- |
| `search_parts`, `get_part`, `suggest_parts` | Find the 34 parts the Lab models and their pins |
| `create_session`, `list_sessions`, `get_session`, `delete_session` | Manage builds |
| `add_part` | Place a part; peripherals auto-wire to a board |
| `connect_pins`, `autowire_part`, `remove_items`, `update_part` | Edit wiring and layout |
| `check_circuit` | The Lab's circuit check: errors, warnings, tips, each part's status |
| `get_controls`, `set_inputs` | Sensor surroundings, actuator commands, board sketch settings |
| `simulate` | Sample every part's state over time |
| `bill_of_materials` | Parts list |
| `export_session` | Write the `.kiungo.json` file (text, path, and a download link in HTTP mode) |
| `import_session` | Read a file exported from Kiungo so the AI can change it |

A `build_robot` prompt template and resources (`kiungo://parts`, `kiungo://parts/{part_id}`, `kiungo://sessions/{id}.kiungo.json`) are also provided.

## Open the result in Kiungo

Engineering Lab → session menu → **Open from file…**, or drop the `.kiungo.json` file on the canvas. Parts the Lab doesn't know and wires to missing pins are skipped with a note in the session log.

## Limits

- The Lab runs a built-in default sketch, not custom firmware; the tools say so to the model.
- There is no resistor, battery or motor-driver part, so some real-world advice (a voltage divider, a separate motor supply) appears as warnings or tips rather than parts.
- This server has no authentication. Run it locally, or put it behind auth before exposing it publicly.

## Try it from a shell

```bash
npm run call -- list
npm run call -- create_session '{"name":"Night light"}'
npm run call -- add_part '{"session_id":"<id>","part_id":"arduino-uno"}'
npm run call -- add_part '{"session_id":"<id>","part_id":"ldr"}'
npm run call -- add_part '{"session_id":"<id>","part_id":"led"}'
npm run call -- export_session '{"session_id":"<id>"}'
```
