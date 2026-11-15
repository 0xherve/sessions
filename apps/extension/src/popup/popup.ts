import type { Action, State } from "../shared/messages";

const views = ["unpaired", "confirm", "ready"] as const;
type View = (typeof views)[number];

function show(view: View) {
  for (const name of views) {
    const el = document.getElementById(`view-${name}`);
    if (el) el.hidden = name !== view;
  }
}

const status = document.getElementById("status") as HTMLElement;
const error = document.getElementById("error") as HTMLElement;
const label = { unpaired: "Not paired", connecting: "Connecting", online: "Connected" };

function render(state: State) {
  status.dataset.state = state.connection;
  status.textContent = label[state.connection];
  show(state.connection === "online" ? "ready" : "unpaired");
  error.hidden = !state.error;
  error.textContent = state.error ?? "";
}

chrome.runtime.sendMessage({ type: "state" }).then(render);
chrome.runtime.onMessage.addListener((state: State) => render(state));

document.getElementById("pair")!.addEventListener("click", () => {
  const code = (document.getElementById("code") as HTMLInputElement).value;
  void chrome.runtime.sendMessage({ type: "pair", code } as Action);
});

document.getElementById("manage")!.addEventListener("click", () => chrome.runtime.openOptionsPage());
