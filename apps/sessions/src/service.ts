import {
  type AuthParams,
  ErrorCode,
  type HelloParams,
  methodNotFound,
  Pairing,
  RpcError,
} from "@sessions/protocol";
import { loadBrowsers, type PairedBrowser } from "./state";

export type Connection = {
  publicKey?: string;
  challenge?: string;
};

type Route = (connection: Connection, params: never) => unknown;

const nameOf = (profile: PairedBrowser) => `${profile.browser} (${profile.id})`;

const hello = async (connection: Connection, params: HelloParams) => {
  if (typeof params.publicKey !== "string")
    throw new RpcError(ErrorCode.InvalidParams, "Bad hello");
  const profile = (await loadBrowsers())[params.publicKey];
  if (!profile)
    throw new RpcError(ErrorCode.Application, "Unknown browser, pair first");
  connection.publicKey = params.publicKey;
  connection.challenge = Pairing.nonce();
  return { challenge: connection.challenge };
};

const auth = async (connection: Connection, params: AuthParams) => {
  if (typeof params.signature !== "string")
    throw new RpcError(ErrorCode.InvalidParams, "Bad auth");
  const challenge = connection.challenge;
  const key = connection.publicKey;
  connection.challenge = undefined;
  if (!challenge || !key)
    throw new RpcError(ErrorCode.Application, "Bad signature");
  const profile = (await loadBrowsers())[key];
  const ok =
    profile && (await Pairing.verify(key, params.signature, challenge));
  if (!ok) throw new RpcError(ErrorCode.Application, "Bad signature");
  console.log(`connected: ${nameOf(profile)}`);
  return null;
};

export const routes: Record<string, Route> = { hello, auth };

export const handle = (
  connection: Connection,
  method: string,
  params: unknown,
) => {
  const route = routes[method];
  if (!route) throw methodNotFound(method);
  return route(connection, params as never);
};
