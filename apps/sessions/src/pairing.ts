import {
  CODE_MAX_STRIKES,
  CODE_TTL_MS,
  createPeer,
  ErrorCode,
  methodNotFound,
  PAIR_PORT,
  Pairing,
  type PairParams,
  type Peer,
  RpcError,
  SERVICE_HOST,
} from "@sessions/protocol";
import { addBrowser, type PairedBrowser } from "./state";

type Paired = { publicKey: string; record: PairedBrowser };

export async function servePairing(code: string) {
  let paired: Paired | undefined;
  let strikes = 0;
  let resolveDone: () => void = () => {};
  const done = new Promise<void>((ok) => {
    resolveDone = ok;
  });

  const server = Bun.serve<{ peer?: Peer }>({
    port: PAIR_PORT,
    hostname: SERVICE_HOST,
    fetch: (request, server) =>
      server.upgrade(request, { data: {} })
        ? undefined
        : new Response("Sessions pairing", { status: 404 }),
    websocket: {
      message(ws, data) {
        ws.data.peer ??= createPeer((out) => ws.send(out), {
          request: async (method, params) => {
            if (method !== "pair") throw methodNotFound(method);
            const { publicKey, profile, code: input } = params as PairParams;
            if (Pairing.normalizeCode(input) !== code) {
              strikes++;
              if (strikes >= CODE_MAX_STRIKES) resolveDone();
              throw new RpcError(
                ErrorCode.Application,
                "That code isn't right.",
              );
            }
            if (
              typeof publicKey !== "string" ||
              typeof profile?.browser !== "string"
            )
              throw new RpcError(
                ErrorCode.InvalidParams,
                "Bad pairing request",
              );
            paired = {
              publicKey,
              record: await addBrowser(publicKey, profile),
            };
            return null;
          },
        });
        void ws.data.peer.receive(String(data)).then(() => {
          if (paired) resolveDone();
        });
      },
    },
  });

  const timer = setTimeout(() => {
    server.stop(true);
    resolveDone();
  }, CODE_TTL_MS);

  await done;
  clearTimeout(timer);
  await Bun.sleep(200);
  server.stop(true);
  return paired;
}
