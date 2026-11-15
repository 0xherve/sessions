import type { Action, State } from "../shared/messages";

let state: State = { connection: "unpaired", error: null };

const push = () => chrome.runtime.sendMessage(state).catch(() => {});

chrome.runtime.onMessage.addListener(
  (message: Action | { type: "state" }, sender, reply) => {
    if (sender.url && !sender.url.startsWith(chrome.runtime.getURL(""))) return;
    if (message.type === "state") return reply(state);
    if (message.type === "pair") {
      state = { connection: "connecting", error: null };
      push();
    }
    reply(state);
  },
);
