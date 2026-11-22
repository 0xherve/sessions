import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { REQUEST_TIMEOUT_MS, type SessionInfo } from "@sessions/protocol";
import { z } from "zod";
import { withAgent } from "./agent";

const text = (result: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
});

const failure = (error: Error) => ({
  content: [{ type: "text" as const, text: error.message }],
  isError: true,
});

const call = async (method: string, params: Record<string, unknown>) =>
  withAgent((peer) =>
    peer.request(method, params, REQUEST_TIMEOUT_MS),
  ) as Promise<{ sessions?: SessionInfo[]; session?: SessionInfo }>;

const tool = (run: () => Promise<unknown>) => async () => {
  try {
    return text(await run());
  } catch (error) {
    return failure(error instanceof Error ? error : new Error(String(error)));
  }
};

export async function runMcp() {
  const server = new McpServer(
    { name: "sessions", version: "0.1.0" },
    {
      instructions:
        "Sessions gives you access to the user's real browser, but only the tabs they explicitly shared. Start with session_list, claim a session with session_use, then act on it with the browser tools.",
    },
  );

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
      tool(() => call("session.use", { sessionId: session_id }))(),
  );

  await server.connect(new StdioServerTransport());
}
