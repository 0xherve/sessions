import {
  CODE_MAX_STRIKES,
  CODE_TTL_MS,
  createPeer,
  ErrorCode,
  methodNotFound,
  normalizeCode,
  PAIR_PORT,
  type PairParams,
  type PairResult,
  type Peer,
  RpcError,
  SERVICE_HOST,
} from "@sessions/shared";
import { addBrowser, getServiceKey } from "./state";

type Paired = { id: string; browser: string };

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
    fetch: (request, server) => {
      const origin = request.headers.get("origin");
      if (origin !== null && !origin.startsWith("chrome-extension://"))
        return new Response("Forbidden", { status: 403 });
      return server.upgrade(request, { data: {} })
        ? undefined
        : new Response("Sessions pairing", { status: 404 });
    },
    websocket: {
      message(ws, data) {
        ws.data.peer ??= createPeer((out) => ws.send(out), {
          request: async (method, params) => {
            if (method !== "pair") throw methodNotFound(method);
            const { publicKey, profile, code: input } = params as PairParams;
            if (normalizeCode(input) !== code) {
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
            const serviceKey = await getServiceKey();
            const id = await addBrowser(publicKey, profile);
            paired = { id, browser: profile.browser };
            const result: PairResult = { id, publicKey: serviceKey.publicKey };
            return result;
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
