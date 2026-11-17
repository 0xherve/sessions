import { POLL_PERIOD_MINUTES } from "@sessions/protocol";
import type { Action, State } from "../shared/messages";
import { startConnection } from "./connection";
import { getIdentity } from "./storage";

let state: State = { connection: "unpaired", error: null };

const push = () => chrome.runtime.sendMessage(state).catch(() => {});

const setState = (next: State) => {
  state = next;
  push();
};

const events = {
  unpaired: () => setState({ connection: "unpaired", error: null }),
  connecting: () => setState({ connection: "connecting", error: null }),
  paired: () => setState({ connection: "paired", error: null }),
  online: () => setState({ connection: "online", error: null }),
};

const connection = startConnection(events, getIdentity);

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

chrome.runtime.onMessage.addListener(
  (message: Action | { type: "state" }, sender, reply) => {
    if (!sender.url?.startsWith(chrome.runtime.getURL(""))) return false;
    if (message.type === "state") {
      void connection.wake();
      return reply(state);
    }
    pairWith(message.code, reply);
    return true;
  },
);

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "connect") void connection.wake();
});
void chrome.alarms.create("connect", { periodInMinutes: POLL_PERIOD_MINUTES });
void connection.wake();
