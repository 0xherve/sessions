import { createPeer } from "@sessions/protocol";
import { SERVICE_HOST, SERVICE_PORT } from "@sessions/protocol";
import { handle, type Connection } from "../service";

export async function start() {
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
          request: (method, params) => handle(connection, method, params),
        });
        connection.peer.receive(data.toString());
      },
    },
  });

  console.log(`Sessions service listening on ${SERVICE_HOST}:${SERVICE_PORT}`);
}
