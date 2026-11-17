import type { Action, State } from "../shared/messages";

const views = ["unpaired", "ready"] as const;
type View = (typeof views)[number];

function show(view: View) {
  for (const name of views) {
    const el = document.getElementById(`view-${name}`);
    if (el) el.hidden = name !== view;
  }
}

const status = document.getElementById("status") as HTMLElement;
const error = document.getElementById("error") as HTMLElement;
const pairButton = document.getElementById("pair") as HTMLButtonElement;
const label = {
  unpaired: "Not paired",
  connecting: "Connecting",
  paired: "Paired",
  online: "Connected",
};

function render(state: State) {
  status.dataset.state = state.connection;
  status.textContent = label[state.connection];
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
    });
  }
}

void send({ type: "state" });
chrome.runtime.onMessage.addListener((state: State) => render(state));

pairButton.addEventListener("click", async () => {
  const code = (document.getElementById("code") as HTMLInputElement).value;
  pairButton.disabled = true;
  await send({ type: "pair", code });
  pairButton.disabled = false;
});
