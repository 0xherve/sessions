import type { Peer } from "@sessions/protocol";
import { POLL_PERIOD_MINUTES } from "@sessions/protocol";
import type { Action, State } from "../shared/messages";
import { startConnection } from "./connection";
import { shared, shareTab, startGroup, startSessions } from "./sessions";
import { getIdentity } from "./storage";

let state: State = { connection: "unpaired", error: null };
let peer: Peer | undefined;

const push = () => chrome.runtime.sendMessage(state).catch(() => {});

const setState = (next: State) => {
  state = next;
  push();
};

const announce = async () => {
  for (const session of await shared())
    peer?.notify("session.created", { session });
};

const events = {
  unpaired: () => {
    peer = undefined;
    setState({ connection: "unpaired", error: null });
  },
  connecting: () => setState({ connection: "connecting", error: null }),
  paired: () => {
    peer = undefined;
    setState({ connection: "paired", error: null });
  },
  online: (connected: Peer) => {
    peer = connected;
    setState({ connection: "online", error: null });
    void announce();
  },
};

const connection = startConnection(events, getIdentity);
startSessions({
  ended: (session) => {
    peer?.notify("session.ended", { sessionId: session.id });
  },
});

function pairWith(code: string, reply: (state: State) => void) {
  setState({ connection: "connecting", error: null });
  connection
    .pair(code)
    .catch((error: unknown) =>
      setState({
        connection: "unpaired",
        error: error instanceof Error ? error.message : String(error),
      }),
    )
    .finally(() => reply(state));
}

async function act(action: Action): Promise<void> {
  if (action.type === "pair") {
    setState({ connection: "connecting", error: null });
    await connection.pair(action.code);
    return;
  }
  if (action.type === "share-tab") {
    const session = await shareTab();
    peer?.notify("session.created", { session });
    return;
  }
  if (action.type === "share-group") {
    const session = await startGroup();
    peer?.notify("session.created", { session });
  }
}

function handle(action: Action, reply: (state: State) => void) {
  act(action)
    .catch((error: unknown) =>
      setState({
        ...state,
        error: error instanceof Error ? error.message : String(error),
      }),
    )
    .finally(() => reply(state));
}

chrome.runtime.onMessage.addListener(
  (message: Action | { type: "state" }, sender, reply) => {
    if (!sender.url?.startsWith(chrome.runtime.getURL(""))) return false;
    if (message.type === "state") {
      void connection.wake();
      return reply(state);
    }
    if (message.type === "pair") pairWith(message.code, reply);
    else handle(message, reply);
    return true;
  },
);

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "connect") void connection.wake();
});
void chrome.alarms.create("connect", { periodInMinutes: POLL_PERIOD_MINUTES });
void connection.wake();
