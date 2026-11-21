import {
  type AgentHelloParams,
  type AuthParams,
  ErrorCode,
  type HelloParams,
  methodNotFound,
  Pairing,
  type Peer,
  RpcError,
  type SessionInfo,
  type SessionRecord,
  type SessionUseParams,
} from "@sessions/protocol";
import { loadBrowsers } from "./state";

export type Connection = {
  peer?: Peer;
  profileId?: string;
  challenge?: string;
  agent?: string;
  claims?: Set<string>;
};

type Route = (connection: Connection, params: never) => unknown;

const connections = new Set<Connection>();

const sessions = new Map<
  string,
  { browserId: string; record: SessionRecord; agent?: Connection }
>();

export const register = (connection: Connection) => {
  connections.add(connection);
};

export const release = (connection: Connection) => {
  connections.delete(connection);
  for (const id of connection.claims ?? []) {
    const session = sessions.get(id);
    if (session?.agent === connection) session.agent = undefined;
  }
  connection.claims = undefined;
};

const toInfo = (
  id: string,
  session: { browserId: string; record: SessionRecord; agent?: Connection },
): SessionInfo => ({
  id,
  kind: session.record.kind,
  title: session.record.title,
  browser: session.browserId,
  claimed: session.agent !== undefined,
});

const notifyAgents = (method: string, params: unknown) => {
  for (const connection of connections)
    if (connection.agent) connection.peer?.notify(method, params);
};

const hello = async (connection: Connection, params: HelloParams) => {
  if (typeof params.profileId !== "string")
    throw new RpcError(ErrorCode.InvalidParams, "Bad hello");
  const paired = (await loadBrowsers())[params.profileId];
  if (!paired)
    throw new RpcError(ErrorCode.Application, "Unknown browser, pair first");
  connection.profileId = params.profileId;
  connection.challenge = Pairing.nonce();
  return { challenge: connection.challenge };
};

const auth = async (connection: Connection, params: AuthParams) => {
  if (typeof params.signature !== "string")
    throw new RpcError(ErrorCode.InvalidParams, "Bad auth");
  const challenge = connection.challenge;
  const profileId = connection.profileId;
  connection.challenge = undefined;
  if (!challenge || !profileId)
    throw new RpcError(ErrorCode.Application, "Bad signature");
  const paired = (await loadBrowsers())[profileId];
  const ok =
    paired &&
    (await Pairing.verify(paired.public_key, params.signature, challenge));
  if (!ok) throw new RpcError(ErrorCode.Application, "Bad signature");
  console.log(`connected: ${paired.browser} (${profileId})`);
  return null;
};

const agentHello = (connection: Connection, params: AgentHelloParams) => {
  if (typeof params.name !== "string" || !params.name.trim())
    throw new RpcError(ErrorCode.InvalidParams, "Bad agent hello");
  connection.agent = params.name.trim();
  console.log(`agent: ${connection.agent}`);
  return {
    sessions: [...sessions.entries()].map(([id, session]) =>
      toInfo(id, session),
    ),
  };
};

const sessionUse = (connection: Connection, params: SessionUseParams) => {
  if (!connection.agent)
    throw new RpcError(
      ErrorCode.Application,
      "Identify with agent.hello first",
    );
  if (typeof params.sessionId !== "string")
    throw new RpcError(ErrorCode.InvalidParams, "Bad session.use");
  const session = sessions.get(params.sessionId);
  if (!session) throw new RpcError(ErrorCode.Application, "No such session");
  if (session.agent && session.agent !== connection)
    throw new RpcError(
      ErrorCode.Application,
      "Session in use by another agent",
    );
  session.agent = connection;
  (connection.claims ??= new Set()).add(params.sessionId);
  return { session: toInfo(params.sessionId, session) };
};

export const routes: Record<string, Route> = {
  hello,
  auth,
  "agent.hello": agentHello,
  "session.use": sessionUse,
};

export const handleNotification = (
  connection: Connection,
  method: string,
  params: unknown,
) => {
  if (!connection.profileId) return;
  if (method === "session.created") {
    const { session } = params as { session: SessionRecord };
    sessions.set(session.id, {
      browserId: connection.profileId,
      record: session,
    });
    notifyAgents("session.created", { session });
  }
  if (method === "session.ended") {
    const { sessionId } = params as { sessionId: string };
    sessions.delete(sessionId);
    notifyAgents("session.ended", { sessionId });
  }
};

export const handle = (
  connection: Connection,
  method: string,
  params: unknown,
) => {
  const route = routes[method];
  if (!route) throw methodNotFound(method);
  return route(connection, params as never);
};
