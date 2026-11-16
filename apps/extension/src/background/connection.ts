import { createPeer, Pairing, SERVICE_HOST, SERVICE_PORT, type Peer } from "@sessions/protocol";

export type ConnectionEvents = {
  online(): void;
  unpaired(): void;
  offline(): void;
};

const RECONNECT_MS = 3000;

const browserBrand = () =>
  (navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } })
    .userAgentData?.brands.map((b) => b.brand)
    .find((b) => !/Chromium|Not.?A.?Brand/i.test(b))
    ?.replace(/^Google /, "") ?? "Chromium";

export function startConnection(
  identity: { profileId: string; identity: Pairing.Identity },
  events: ConnectionEvents,
) {
  let socket: WebSocket | undefined;
  let peer: Peer | undefined;
  let waiting = false;

  const handshake = async () => {
    const session = peer!;
    const { challenge } = (await session.request("hello", { profileId: identity.profileId }, 5000)) as {
      challenge: string;
    };
    await session.request("auth", { signature: await identity.identity.sign(challenge) }, 5000);
  };

  const connect = () =>
    new Promise<void>((resolve) => {
      if (socket && socket.readyState <= WebSocket.OPEN) return resolve();
      const sock = new WebSocket(`ws://${SERVICE_HOST}:${SERVICE_PORT}`);
      socket = sock;
      sock.onopen = () => {
        peer ??= createPeer((out) => sock.send(out));
        resolve();
      };
      sock.onmessage = (event) => {
        void peer!.receive(event.data as string);
      };
      sock.onclose = () => {
        peer?.close(new Error("socket closed"));
        peer = undefined;
        if (!waiting) {
          events.offline();
          setTimeout(connect, RECONNECT_MS);
        }
      };
      sock.onerror = () => sock.close();
    });

  const ready = async () => {
    try {
      await connect();
      await handshake();
      events.online();
    } catch {
      waiting = true;
      events.unpaired();
    }
  };

  const pair = async (code: string) => {
    try {
      await connect();
      const session = peer!;
      await session.request(
        "pair",
        {
          profile: { id: identity.profileId, browser: browserBrand() },
          publicKey: identity.identity.publicKey,
          code,
        },
        5000,
      );
      await handshake();
      waiting = false;
      events.online();
    } catch (error) {
      waiting = true;
      events.unpaired();
      throw error;
    }
  };

  void ready();
  return { pair };
}
