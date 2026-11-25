import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerInputTools } from "./input";
import { registerPageTools } from "./page";
import { registerSessionTools } from "./sessions";

export async function runMcp() {
  const server = new McpServer(
    { name: "sessions", version: "0.1.0" },
    {
      instructions:
        "Sessions gives you the user's real browser, but only the tabs they explicitly shared. Start with session_list, claim a session with session_use, read the page with page_snapshot, then act with page_click, page_type, page_select, page_press_key, page_navigate or page_navigate_back using refs from the snapshot. Actions return a fresh snapshot. Call session_release when done. The user can end a session at any time by detaching the debugger.",
    },
  );

  registerSessionTools(server);
  registerPageTools(server);
  registerInputTools(server);

  await server.connect(new StdioServerTransport());
}
