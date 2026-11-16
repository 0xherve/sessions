import {
  ErrorCode,
  RpcError,
  Pairing,
  createPeer,
  methodNotFound,
  type Peer,
  type Profile,
  type PairParams,
  type HelloParams,
  type AuthParams,
  SERVICE_HOST,
  SERVICE_PORT,
} from "@sessions/protocol";
import { loadBrowsers, saveBrowsers } from "./state";

const codeTtl = 10 * 60_000;

const browsers = await loadBrowsers();
let pending: { code: string; expires: number } | undefined;

type Connection = {
  peer?: Peer;
  profileId?: string;
  challenge?: string;
};

const mintCode = () => {
  const code = Pairing.generateCode();
  pending = { code, expires: Date.now() + codeTtl };
  return Pairing.formatCode(code);
};

const takeCode = (code: string) => {
  const canonical = Pairing.normalizeCode(code);
  const ok = pending !== undefined && pending.code === canonical && pending.expires > Date.now();
  if (!ok)
    throw new RpcError(ErrorCode.Application, "No pending pairing for this code");
  pending = undefined;
};

const nameOf = (profile: Profile) => `${profile.browser} (${profile.id.slice(0, 4)})`;

const pairBegin = (): string => mintCode();

const pair = (connection: Connection, params: PairParams) => {
  takeCode(params.code);
  browsers[params.profile.id] = { profile: params.profile, publicKey: params.publicKey };
  void saveBrowsers(browsers);
  connection.profileId = params.profile.id;
  console.log(`paired: ${nameOf(params.profile)}`);
  return null;
};

const hello = (connection: Connection, params: HelloParams) => {
  const paired = browsers[params.profileId];
  if (!paired)
    throw new RpcError(ErrorCode.Application, "Unknown profile, pair first");
  connection.profileId = params.profileId;
  connection.challenge = Pairing.nonce();
  return { challenge: connection.challenge };
};

const auth = async (connection: Connection, params: AuthParams) => {
  const challenge = connection.challenge;
  connection.challenge = undefined;
  const paired = connection.profileId ? browsers[connection.profileId] : undefined;
  const ok = challenge && paired && (await Pairing.verify(paired.publicKey, params.signature, challenge));
  if (!ok) throw new RpcError(ErrorCode.Application, "Bad signature");
  console.log(`connected: ${nameOf(paired.profile)}`);
  return null;
};

const routes: Record<string, (connection: Connection, params: any) => unknown> = {
  "pair.begin": pairBegin,
  pair,
  hello,
  auth,
};

Bun.serve<Connection>({
  port: SERVICE_PORT,
  hostname: SERVICE_HOST,
  fetch: (request, server) =>
    server.upgrade(request, { data: {} as Connection })
      ? undefined
      : new Response("Sessions service — for browsers and agents", { status: 404 }),
  websocket: {
    message(ws, data) {
      const connection = ws.data;
      connection.peer ??= createPeer((out) => ws.send(out), {
        request: async (method, params) => {
          const route = routes[method];
          if (!route) throw methodNotFound(method);
          return route(connection, params);
        },
      });
      connection.peer.receive(data.toString());
    },
  },
});

console.log(`service listening on ${SERVICE_HOST}:${SERVICE_PORT}`);
