import {
  type AgentHelloParams,
  type AuthParams,
  type BrowserUnpairParams,
  ErrorCode,
  type HelloParams,
  methodNotFound,
  nonce,
  type Peer,
  RpcError,
  type SessionCommandParams,
  type SessionInfo,
  type SessionRecord,
  type SessionReleaseParams,
  type SessionUseParams,
  verify,
} from "@sessions/shared";
import { loadBrowsers, saveBrowsers } from "./state";

export type Connection = {
  peer?: Peer;
  profileId?: string;
  challenge?: string;
  agent?: string;
  claims?: Set<string>;
  close?: () => void;
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
  connection.challenge = nonce();
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
    paired && (await verify(paired.public_key, params.signature, challenge));
  if (!ok) throw new RpcError(ErrorCode.Application, "Bad signature");
  console.error(`connected: ${paired.browser} (${profileId})`);
  return null;
};

const agentHello = (connection: Connection, params: AgentHelloParams) => {
  if (typeof params.name !== "string" || !params.name.trim())
    throw new RpcError(ErrorCode.InvalidParams, "Bad agent hello");
  connection.agent = params.name.trim();
  console.error(`agent: ${connection.agent}`);
  return {
    sessions: [...sessions.entries()].map(([id, session]) =>
      toInfo(id, session),
    ),
  };
};

const browserUnpair = async (
  _connection: Connection,
  params: BrowserUnpairParams,
) => {
  const browsers = await loadBrowsers();
  delete browsers[params.profileId];
  await saveBrowsers(browsers);
  for (const [id, session] of sessions)
    if (session.browserId === params.profileId) {
      sessions.delete(id);
      notifyAgents("session.ended", { sessionId: id });
    }
  for (const connection of connections)
    if (connection.profileId === params.profileId) connection.close?.();
  return null;
};

const serviceStop = () => {
  setTimeout(() => process.kill(process.pid, "SIGTERM"), 100);
  return null;
};

const lookup = (connection: Connection, sessionId: unknown) => {
  if (!connection.agent)
    throw new RpcError(
      ErrorCode.Application,
      "Identify with agent.hello first",
    );
  if (typeof sessionId !== "string")
    throw new RpcError(ErrorCode.InvalidParams, "Bad sessionId");
  const session = sessions.get(sessionId);
  if (!session) throw new RpcError(ErrorCode.Application, "No such session");
  return session;
};

const sessionUse = (connection: Connection, params: SessionUseParams) => {
  const session = lookup(connection, params.sessionId);
  if (session.agent && session.agent !== connection)
    throw new RpcError(
      ErrorCode.Application,
      "Session in use by another agent",
    );
  session.agent = connection;
  connection.claims ??= new Set();
  connection.claims.add(params.sessionId);
  return { session: toInfo(params.sessionId, session) };
};

const sessionRelease = (
  connection: Connection,
  params: SessionReleaseParams,
) => {
  const session = lookup(connection, params.sessionId);
  if (session.agent !== connection)
    throw new RpcError(
      ErrorCode.Application,
      "You have not claimed this session",
    );
  session.agent = undefined;
  connection.claims?.delete(params.sessionId);
  return { session: toInfo(params.sessionId, session) };
};

const sessionCommand = async (
  connection: Connection,
  params: SessionCommandParams,
) => {
  const session = lookup(connection, params.sessionId);
  if (session.agent !== connection)
    throw new RpcError(
      ErrorCode.Application,
      "Claim the session with session.use first",
    );
  const browser = [...connections].find(
    (c) => c.profileId === session.browserId && c.peer,
  );
  if (!browser?.peer)
    throw new RpcError(ErrorCode.Application, "The browser is offline");
  return await browser.peer.request("session.command", {
    sessionId: params.sessionId,
    command: params.command,
  });
};

export const routes: Record<string, Route> = {
  hello,
  auth,
  "browser.unpair": browserUnpair,
  "service.stop": serviceStop,
  "agent.hello": agentHello,
  "session.use": sessionUse,
  "session.release": sessionRelease,
  "session.command": sessionCommand,
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
