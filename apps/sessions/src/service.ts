import {
  ErrorCode,
  Pairing,
  RpcError,
  methodNotFound,
  type AuthParams,
  type HelloParams,
} from "@sessions/protocol";
import { loadBrowsers } from "./state";

export type Connection = {
  profileId?: string;
  challenge?: string;
};

type Route = (connection: Connection, params: never) => unknown;

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
    paired && (await Pairing.verify(paired.public_key, params.signature, challenge));
  if (!ok) throw new RpcError(ErrorCode.Application, "Bad signature");
  console.log(`connected: ${paired.browser} (${profileId})`);
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
