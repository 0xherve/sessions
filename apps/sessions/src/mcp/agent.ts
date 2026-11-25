import {
  createPeer,
  type Peer,
  SERVICE_HOST,
  SERVICE_PORT,
} from "@sessions/protocol";

let connection: { socket: WebSocket; peer: Peer } | undefined;
let notification: ((method: string, params: unknown) => void) | undefined;

export const onNotification = (
  handler: (method: string, params: unknown) => void,
) => {
  notification = handler;
};

async function connect(): Promise<{ socket: WebSocket; peer: Peer }> {
  if (connection?.socket.readyState === WebSocket.OPEN) return connection;
  const socket = new WebSocket(`ws://${SERVICE_HOST}:${SERVICE_PORT}`);
  const peer = createPeer((out) => socket.send(out), {
    notification: (method, params) => notification?.(method, params),
  });
  socket.onmessage = (event) => void peer.receive(String(event.data));
  await new Promise<void>((ok, fail) => {
    socket.onopen = () => ok();
    socket.onerror = () =>
      fail(new Error("the sessions service is not running"));
  });
  connection = { socket, peer };
  return connection;
}

export async function withAgent(run: (peer: Peer) => Promise<unknown>) {
  const { peer } = await connect();
  try {
    return await run(peer);
  } catch (cause) {
    if (connection?.socket.readyState !== WebSocket.OPEN)
      connection = undefined;
    throw cause;
  }
}
