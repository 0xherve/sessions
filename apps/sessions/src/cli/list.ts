import { REQUEST_TIMEOUT_MS, type SessionInfo } from "@sessions/shared";
import { connect } from "./client";

export async function list(options: { json?: boolean }) {
  const { peer, close } = await connect();
  const reply = (await peer.request(
    "agent.hello",
    { name: "cli" },
    REQUEST_TIMEOUT_MS,
  )) as { sessions: SessionInfo[] };
  close();

  if (options.json) {
    console.log(JSON.stringify(reply.sessions, null, 2));
    return;
  }

  if (!reply.sessions.length) {
    console.log("no shared sessions");
    return;
  }

  const idWidth = Math.max(...reply.sessions.map((s) => s.id.length));
  for (const session of reply.sessions)
    console.log(
      `${session.id.padEnd(idWidth)}  ${session.kind.padEnd(6)}  ` +
        `${session.title.padEnd(30)}  ` +
        `${session.claimed ? "claimed" : "open"}`,
    );
}
