import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { onNotification } from "./agent";
import { call, getClaimed, requireClaimed, setClaimed, tool } from "./tools";

export function registerSessionTools(server: McpServer) {
  onNotification((method, params) => {
    if (
      method === "session.ended" &&
      (params as { sessionId: string }).sessionId === getClaimed()
    )
      setClaimed(undefined);
  });

  server.registerTool(
    "session_list",
    {
      description: "List browser sessions the user has shared",
      inputSchema: {},
    },
    async () => tool(() => call("agent.hello", { name: "agent" }))(),
  );

  server.registerTool(
    "session_use",
    {
      description: "Claim a shared session so you can act on it",
      inputSchema: { session_id: z.string().describe("id from session_list") },
    },
    async ({ session_id }) =>
      tool(async () => {
        const current = getClaimed();
        if (current && current !== session_id)
          throw new Error(
            `already holding session ${current}; call session_release first`,
          );
        const reply = await call("session.use", { sessionId: session_id });
        setClaimed(reply.session?.id ?? session_id);
        return reply;
      })(),
  );

  server.registerTool(
    "session_release",
    {
      description: "Release the claimed session so other agents can use it",
      inputSchema: {},
    },
    async () =>
      tool(async () => {
        const reply = await call("session.release", {
          sessionId: requireClaimed(),
        });
        setClaimed(undefined);
        return reply;
      })(),
  );
}
