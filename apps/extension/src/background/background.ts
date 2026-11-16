import type { Action, State } from "../shared/messages";
import { loadIdentity } from "./storage";
import { startConnection } from "./connection";

let state: State = { connection: "unpaired", error: null };

const push = () => chrome.runtime.sendMessage(state).catch(() => {});

const setState = (next: State) => {
  state = next;
  push();
};

const events = {
  online: () => setState({ connection: "online", error: null }),
  unpaired: () => setState({ connection: "unpaired", error: null }),
  offline: () => setState({ connection: "connecting", error: null }),
};

const identity = await loadIdentity();
const connection = startConnection(identity, events);

chrome.runtime.onMessage.addListener(
  (message: Action | { type: "state" }, sender, reply) => {
    if (sender.url && !sender.url.startsWith(chrome.runtime.getURL(""))) return;
    if (message.type === "state") return reply(state);
    if (message.type === "pair") {
      setState({ connection: "connecting", error: null });
      connection.pair(message.code).catch((error: Error) =>
        setState({ connection: "unpaired", error: error.message }),
      );
    }
    reply(state);
  },
);
