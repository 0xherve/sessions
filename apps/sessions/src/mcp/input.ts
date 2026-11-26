import { resolve } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { command, tool } from "./tools";

export function registerInputTools(server: McpServer) {
  server.registerTool(
    "page_click",
    {
      description:
        "Click an element by ref from page_snapshot. Returns a fresh snapshot",
      inputSchema: { ref: z.string().describe("ref from page_snapshot") },
    },
    async ({ ref }) => tool(() => command({ action: "click", ref }))(),
  );

  server.registerTool(
    "page_upload",
    {
      description:
        "Set files on a file input by ref from page_snapshot. Paths are on this computer. Returns a fresh snapshot",
      inputSchema: {
        ref: z.string().describe("ref of a file input from page_snapshot"),
        paths: z.array(z.string()).min(1),
      },
    },
    async ({ ref, paths }) =>
      tool(async () => {
        const files = paths.map((path) => resolve(path));
        for (const file of files)
          if (!(await Bun.file(file).exists()))
            throw new Error(`no such file: ${file}`);
        return command({ action: "upload", ref, paths: files });
      })(),
  );

  server.registerTool(
    "page_type",
    {
      description:
        "Type text into an element by ref from page_snapshot, optionally pressing Enter after. Returns a fresh snapshot",
      inputSchema: {
        ref: z.string().describe("ref from page_snapshot"),
        text: z.string(),
        submit: z.boolean().optional().describe("press Enter after typing"),
      },
    },
    async ({ ref, text, submit }) =>
      tool(() => command({ action: "type", ref, text, submit }))(),
  );

  server.registerTool(
    "page_select",
    {
      description:
        "Select option values in a dropdown by ref from page_snapshot. Returns a fresh snapshot",
      inputSchema: {
        ref: z.string().describe("ref from page_snapshot"),
        values: z.array(z.string()),
      },
    },
    async ({ ref, values }) =>
      tool(() => command({ action: "select", ref, values }))(),
  );

  server.registerTool(
    "page_press_key",
    {
      description:
        "Press a keyboard key in the claimed tab, such as Enter, Escape or ArrowDown. Returns a fresh snapshot",
      inputSchema: { key: z.string() },
    },
    async ({ key }) => tool(() => command({ action: "press_key", key }))(),
  );
}
