import type { Action, State } from "../messages";

const views = ["unpaired", "ready"] as const;
type View = (typeof views)[number];

function show(view: View) {
  for (const name of views) {
    const el = document.getElementById(`view-${name}`);
    if (el) el.hidden = name !== view;
  }
}

const status = document.getElementById("status") as HTMLElement;
const unpairedHint = document.getElementById("unpaired-hint") as HTMLElement;
const readyNote = document.getElementById("ready-note") as HTMLElement;
const error = document.getElementById("error") as HTMLElement;
const pairButton = document.getElementById("pair") as HTMLButtonElement;
const shareTabButton = document.getElementById(
  "share-tab",
) as HTMLButtonElement;
const shareGroupButton = document.getElementById(
  "share-group",
) as HTMLButtonElement;
const sharingText = document.getElementById("sharing") as HTMLElement;
const stopButton = document.getElementById("stop") as HTMLButtonElement;
const actionButtons = [shareTabButton, shareGroupButton, stopButton];
const label = {
  unpaired: "Not paired",
  connecting: "Pairing",
  paired: "Offline",
  online: "Connected",
};
const hint = {
  unpaired:
    "Run <code>sessions pair</code> in your terminal, then paste the code here.",
  connecting: "Checking the code with the service.",
  paired: "Shares go live when it's back.",
  online: "Agents can only see what you share.",
};

function render(state: State) {
  const active = state.sharing.tab || state.sharing.group;
  for (const button of actionButtons) button.disabled = false;
  shareTabButton.hidden = active;
  shareGroupButton.hidden = active;
  stopButton.hidden = !active;
  sharingText.hidden = !active;
  sharingText.textContent = state.sharing.group
    ? "Sharing this tab group"
    : "Sharing this tab";
  status.dataset.state = state.connection;
  status.textContent = label[state.connection];
  unpairedHint.innerHTML = hint[state.connection];
  readyNote.innerHTML = hint[state.connection];
  show(
    state.connection === "unpaired" || state.connection === "connecting"
      ? "unpaired"
      : "ready",
  );
  error.hidden = !state.error;
  error.textContent = state.error ?? "";
}

async function send(message: Action | { type: "state" }) {
  try {
    render((await chrome.runtime.sendMessage(message)) as State);
  } catch (cause) {
    render({
      connection: "unpaired",
      error: cause instanceof Error ? cause.message : String(cause),
      sharing: { tab: false, group: false },
    });
  }
}

void send({ type: "state" });
chrome.runtime.onMessage.addListener((state: State) => render(state));

async function act(message: Action) {
  for (const button of actionButtons) button.disabled = true;
  await send(message);
}

pairButton.addEventListener("click", async () => {
  const code = (document.getElementById("code") as HTMLInputElement).value;
  pairButton.disabled = true;
  await send({ type: "pair", code });
  pairButton.disabled = false;
});

shareTabButton.addEventListener("click", () => void act({ type: "share-tab" }));
shareGroupButton.addEventListener(
  "click",
  () => void act({ type: "share-group" }),
);

stopButton.addEventListener("click", () => void act({ type: "stop" }));
