import { createPeer, SERVICE_HOST, SERVICE_PORT } from "@sessions/shared";

export async function connect() {
  const ws = new WebSocket(`ws://${SERVICE_HOST}:${SERVICE_PORT}`);
  await new Promise((ok, fail) => {
    ws.onopen = ok;
    ws.onerror = () =>
      fail(new Error("service is not running, start it with sessions start"));
  });
  const peer = createPeer((data) => ws.send(data));
  ws.onmessage = (event) => void peer.receive(event.data as string);
  return { peer, close: () => ws.close() };
}
