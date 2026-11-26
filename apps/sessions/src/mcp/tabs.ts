import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { command, tool } from "./tools";

export function registerTabTools(server: McpServer) {
  server.registerTool(
    "tab_list",
    {
      description:
        "List the tabs in the claimed session. The active tab is the one page tools act on",
      inputSchema: {},
    },
    async () => tool(() => command({ action: "tab_list" }))(),
  );

  server.registerTool(
    "tab_new",
    {
      description:
        "Open a new tab in the claimed group session and make it active",
      inputSchema: { url: z.url().optional() },
    },
    async ({ url }) => tool(() => command({ action: "tab_new", url }))(),
  );

  server.registerTool(
    "tab_select",
    {
      description:
        "Make a tab in the claimed group session active, so page tools act on it",
      inputSchema: { tab_id: z.number().describe("id from tab_list") },
    },
    async ({ tab_id }) =>
      tool(() => command({ action: "tab_select", tabId: tab_id }))(),
  );

  server.registerTool(
    "tab_close",
    {
      description:
        "Close a tab in the claimed group session. The last tab can't be closed",
      inputSchema: { tab_id: z.number().describe("id from tab_list") },
    },
    async ({ tab_id }) =>
      tool(() => command({ action: "tab_close", tabId: tab_id }))(),
  );
}
