import {
  createPeer,
  type Peer,
  SERVICE_HOST,
  SERVICE_PORT,
} from "@sessions/protocol";
import {
  type Connection,
  handle,
  handleNotification,
  register,
  release,
} from "../service";

export async function start() {
  Bun.serve<Connection & { peer?: Peer }>({
    port: SERVICE_PORT,
    hostname: SERVICE_HOST,
    fetch: (request, server) =>
      server.upgrade(request, { data: {} })
        ? undefined
        : new Response("Sessions service — for browsers and agents", {
            status: 404,
          }),
    websocket: {
      open(ws) {
        register(ws.data);
      },
      close(ws) {
        release(ws.data);
      },
      message(ws, data) {
        ws.data.peer ??= createPeer((out) => ws.send(out), {
          request: (method, params) => handle(ws.data, method, params),
          notification: (method, params) =>
            handleNotification(ws.data, method, params),
        });
        void ws.data.peer.receive(data.toString());
      },
    },
  });

  console.log(`Sessions service listening on ${SERVICE_HOST}:${SERVICE_PORT}`);
}
