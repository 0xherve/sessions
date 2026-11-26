import {
  createPeer,
  ErrorCode,
  methodNotFound,
  PAIR_PORT,
  Pairing,
  type Peer,
  REQUEST_TIMEOUT_MS,
  RpcError,
  SERVICE_HOST,
  SERVICE_PORT,
  type SessionCommandParams,
} from "@sessions/shared";
import { runCommand } from "./driver";
import { getProfileId, saveProfileId } from "./storage";

export type ConnectionEvents = {
  unpaired(): void;
  connecting(): void;
  paired(): void;
  online(peer: Peer): void;
};

const browserBrand = () =>
  (
    navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } }
  ).userAgentData?.brands
    .map((b) => b.brand)
    .find((b) => !/Chromium|Not.?A.?Brand/i.test(b))
    ?.replace(/^Google /, "") ?? "Chromium";

const openSocket = (port: number) =>
  new Promise<{ socket: WebSocket; peer: Peer }>((ok, fail) => {
    const socket = new WebSocket(`ws://${SERVICE_HOST}:${port}`);
    const peer = createPeer((out) => socket.send(out), {
      request: (method, params) => {
        if (method === "session.command")
          return runCommand(params as SessionCommandParams);
        throw methodNotFound(method);
      },
    });
    socket.onmessage = (event) => void peer.receive(String(event.data));
    socket.onopen = () => ok({ socket, peer });
    socket.onerror = () =>
      fail(
        new Error(
          port === PAIR_PORT
            ? "no pairing window is open — run sessions pair"
            : "the service is offline",
        ),
      );
  });

export function startConnection(
  events: ConnectionEvents,
  getIdentity: () => Promise<Pairing.Identity>,
) {
  let socket: WebSocket | undefined;
  let peer: Peer | undefined;
  let trying = false;

  const authenticate = async (session: Peer) => {
    const [identity, profileId] = await Promise.all([
      getIdentity(),
      getProfileId(),
    ]);
    if (!profileId) throw new RpcError(ErrorCode.Application, "not paired");
    const { challenge } = (await session.request(
      "hello",
      { profileId },
      REQUEST_TIMEOUT_MS,
    )) as { challenge: string };
    await session.request(
      "auth",
      { signature: await identity.sign(challenge) },
      REQUEST_TIMEOUT_MS,
    );
  };

  const tryService = async () => {
    if (trying || socket) return;
    trying = true;
    try {
      const opened = await openSocket(SERVICE_PORT);
      try {
        await authenticate(opened.peer);
      } catch (error) {
        opened.socket.close();
        throw error;
      }
      socket = opened.socket;
      peer = opened.peer;
      socket.onclose = () => {
        peer?.close(new Error("socket closed"));
        socket = undefined;
        peer = undefined;
        events.paired();
      };
      events.online(opened.peer);
    } finally {
      trying = false;
    }
  };

  const wake = async () => {
    if (socket) return;
    try {
      await tryService();
    } catch (error) {
      if (error instanceof RpcError) events.unpaired();
    }
  };

  const pair = async (input: string) => {
    const code = Pairing.normalizeCode(input);
    if (!code)
      throw new Error(
        "A pairing code has 8 letters and digits, like ABCD-1234.",
      );
    events.connecting();
    const identity = await getIdentity();
    const opened = await openSocket(PAIR_PORT);
    try {
      const paired = (await opened.peer.request(
        "pair",
        {
          profile: { browser: browserBrand() },
          publicKey: identity.publicKey,
          code,
        },
        REQUEST_TIMEOUT_MS,
      )) as { id: string };
      await saveProfileId(paired.id);
    } finally {
      opened.socket.close();
    }
    events.paired();
    try {
      await tryService();
    } catch {
      events.paired();
    }
  };

  return { pair, wake };
}
