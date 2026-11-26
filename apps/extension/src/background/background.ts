import type { Peer, SessionRecord } from "@sessions/shared";
import { POLL_PERIOD_MINUTES } from "@sessions/shared";
import type { Action, State } from "../shared/messages";
import { startConnection } from "./connection";
import { detachSession, startDriver } from "./driver";
import {
  sessionForTab,
  shared,
  shareTab,
  startGroup,
  startSessions,
  unshare,
} from "./sessions";
import { getIdentity, getProfileId } from "./storage";

type Status = Omit<State, "sharing">;

let state: Status = { connection: "unpaired", error: null };
let peer: Peer | undefined;

const restored = getProfileId()
  .then((profileId) => {
    if (profileId && state.connection === "unpaired")
      state = { connection: "paired", error: null };
  })
  .catch(() => {});

const current = async (): Promise<State> => {
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  const records = await shared();
  const groupId = tab?.groupId && tab.groupId > 0 ? tab.groupId : undefined;
  return {
    ...state,
    sharing: {
      tab: tab?.id !== undefined && records.some((r) => r.tabId === tab.id),
      group:
        groupId !== undefined && records.some((r) => r.groupId === groupId),
    },
  };
};

const respond = (reply: (state: State) => void) =>
  void current()
    .catch((): State => ({ ...state, sharing: { tab: false, group: false } }))
    .then(reply);

const setState = (next: Status) => {
  state = next;
  void current()
    .then((full) => chrome.runtime.sendMessage(full).catch(() => {}))
    .catch(() => {});
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
startDriver((tabId) => {
  void sessionForTab(tabId)
    .then((session) => {
      if (session) return endSession(session);
    })
    .catch(() => {});
});

async function endSession(session: SessionRecord) {
  try {
    await unshare(session.id);
    peer?.notify("session.ended", { sessionId: session.id });
    await detachSession(session);
  } finally {
    setState(state);
  }
}

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
    .finally(() => respond(reply));
}

async function act(action: Action): Promise<void> {
  if (action.type === "share-tab") {
    const session = await shareTab();
    peer?.notify("session.created", { session });
    return;
  }
  if (action.type === "share-group") {
    const session = await startGroup();
    peer?.notify("session.created", { session });
    return;
  }
  if (action.type === "stop") {
    const [tab] = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    const session = tab?.id ? await sessionForTab(tab.id) : undefined;
    if (session) await endSession(session);
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
    .finally(() => respond(reply));
}

chrome.runtime.onMessage.addListener(
  (message: Action | { type: "state" }, sender, reply) => {
    if (!sender.url?.startsWith(chrome.runtime.getURL(""))) return false;
    if (message.type === "state") {
      void restored.then(() => {
        respond(reply);
        void connection.wake();
      });
      return true;
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
void restored.then(() => connection.wake());
