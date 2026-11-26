import {
  createPeer,
  ErrorCode,
  type HelloResult,
  methodNotFound,
  nonce,
  normalizeCode,
  PAIR_PORT,
  type PairResult,
  type Peer,
  REQUEST_TIMEOUT_MS,
  RpcError,
  SERVICE_HOST,
  SERVICE_PORT,
  type SessionCommandParams,
  verify,
} from "@sessions/shared";
import { runCommand } from "./driver";
import {
  getProfileId,
  getServiceKey,
  saveProfileId,
  saveServiceKey,
} from "./storage";

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

type Opened = { socket: WebSocket; peer: Peer; trust: () => void };

const openSocket = (port: number) =>
  new Promise<Opened>((ok, fail) => {
    let trusted = false;
    const socket = new WebSocket(`ws://${SERVICE_HOST}:${port}`);
    const peer = createPeer((out) => socket.send(out), {
      request: (method, params) => {
        if (method === "session.command" && trusted)
          return runCommand(params as SessionCommandParams);
        throw methodNotFound(method);
      },
    });
    socket.onmessage = (event) => void peer.receive(String(event.data));
    socket.onopen = () => ok({ socket, peer, trust: () => (trusted = true) });
    socket.onerror = () =>
      fail(
        new Error(
          port === PAIR_PORT
            ? "no pairing window is open — run sessions pair"
            : "the service is offline",
        ),
      );
  });

export function startConnection(events: ConnectionEvents) {
  let socket: WebSocket | undefined;
  let peer: Peer | undefined;
  let trying = false;

  const authenticate = async (session: Peer) => {
    const [profileId, serviceKey] = await Promise.all([
      getProfileId(),
      getServiceKey(),
    ]);
    if (!profileId || !serviceKey)
      throw new RpcError(ErrorCode.Application, "not paired");
    const proof = nonce();
    const { signature } = (await session.request(
      "hello",
      { profileId, nonce: proof },
      REQUEST_TIMEOUT_MS,
    )) as HelloResult;
    if (!(await verify(serviceKey, signature, proof)))
      throw new Error("the service couldn't prove who it is");
  };

  const tryService = async () => {
    if (trying || socket) return;
    trying = true;
    try {
      const opened = await openSocket(SERVICE_PORT);
      try {
        await authenticate(opened.peer);
        opened.trust();
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
    const code = normalizeCode(input);
    if (!code)
      throw new Error(
        "A pairing code has 8 letters and digits, like ABCD-1234.",
      );
    events.connecting();
    const opened = await openSocket(PAIR_PORT);
    try {
      const paired = (await opened.peer.request(
        "pair",
        {
          profile: { browser: browserBrand() },
          code,
        },
        REQUEST_TIMEOUT_MS,
      )) as PairResult;
      await saveServiceKey(paired.publicKey);
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
