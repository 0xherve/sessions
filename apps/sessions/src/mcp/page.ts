import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { command, tool } from "./tools";

export function registerPageTools(server: McpServer) {
  server.registerTool(
    "page_snapshot",
    {
      description:
        "Read the claimed tab as an accessibility snapshot. Element refs for click, type and select come from here",
      inputSchema: {},
    },
    async () => tool(() => command({ action: "snapshot" }))(),
  );

  server.registerTool(
    "page_navigate",
    {
      description:
        "Navigate the claimed session's tab to a URL. Returns a fresh snapshot",
      inputSchema: { url: z.url() },
    },
    async ({ url }) => tool(() => command({ action: "navigate", url }))(),
  );

  server.registerTool(
    "page_navigate_back",
    {
      description:
        "Go back in the claimed tab's history. Returns a fresh snapshot",
      inputSchema: {},
    },
    async () => tool(() => command({ action: "navigate_back" }))(),
  );

  server.registerTool(
    "page_screenshot",
    {
      description: "Capture a screenshot of the claimed session's tab",
      inputSchema: {},
    },
    async () => tool(() => command({ action: "screenshot" }))(),
  );

  server.registerTool(
    "page_evaluate",
    {
      description:
        "Evaluate JavaScript in the claimed session's tab and return the result",
      inputSchema: { expression: z.string() },
    },
    async ({ expression }) =>
      tool(() => command({ action: "evaluate", expression }))(),
  );
}
