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
    "page_navigate_forward",
    {
      description:
        "Go forward in the claimed tab's history. Returns a fresh snapshot",
      inputSchema: {},
    },
    async () => tool(() => command({ action: "navigate_forward" }))(),
  );

  server.registerTool(
    "page_reload",
    {
      description: "Reload the claimed session's tab. Returns a fresh snapshot",
      inputSchema: {},
    },
    async () => tool(() => command({ action: "reload" }))(),
  );

  server.registerTool(
    "page_info",
    {
      description: "Get the current URL and title of the claimed session's tab",
      inputSchema: {},
    },
    async () => tool(() => command({ action: "info" }))(),
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
    "page_console",
    {
      description:
        "Read console messages and uncaught page errors from the claimed tab since the last call. Recording starts with your first command on the tab",
      inputSchema: {},
    },
    async () => tool(() => command({ action: "console" }))(),
  );

  server.registerTool(
    "page_network_failures",
    {
      description:
        "Read failed network requests (errors and HTTP 400+) from the claimed tab since the last call",
      inputSchema: {},
    },
    async () => tool(() => command({ action: "network" }))(),
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
