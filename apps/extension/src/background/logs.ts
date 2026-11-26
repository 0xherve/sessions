import type { ConsoleEntry, NetworkFailure } from "@sessions/shared";

const LIMIT = 200;

const consoles = new Map<number, ConsoleEntry[]>();
const failures = new Map<number, NetworkFailure[]>();
const requests = new Map<
  number,
  Map<string, { url: string; method: string }>
>();

const push = <T>(store: Map<number, T[]>, tabId: number, entry: T) => {
  const entries = store.get(tabId) ?? [];
  entries.push(entry);
  if (entries.length > LIMIT) entries.shift();
  store.set(tabId, entries);
};

const take = <T>(store: Map<number, T[]>, tabId: number) => {
  const entries = store.get(tabId) ?? [];
  store.delete(tabId);
  return entries;
};

export const clearLogs = (tabId: number) => {
  consoles.delete(tabId);
  failures.delete(tabId);
  requests.delete(tabId);
};

export const takeConsole = (tabId: number) => take(consoles, tabId);
export const takeFailures = (tabId: number) => take(failures, tabId);

type RemoteObject = { value?: unknown; description?: string };

type Event = {
  type?: string;
  args?: RemoteObject[];
  exceptionDetails?: { text: string; exception?: { description?: string } };
  requestId?: string;
  request?: { url: string; method: string };
  response?: { url: string; status: number };
  errorText?: string;
  canceled?: boolean;
};

const handle = (tabId: number, method: string, event: Event) => {
  const pending = requests.get(tabId) ?? new Map();
  requests.set(tabId, pending);
  const request = event.requestId ? pending.get(event.requestId) : undefined;
  if (method === "Runtime.consoleAPICalled")
    push(consoles, tabId, {
      level: event.type ?? "log",
      text: (event.args ?? [])
        .map((arg) => arg.description ?? String(arg.value))
        .join(" "),
    });
  else if (method === "Runtime.exceptionThrown" && event.exceptionDetails)
    push(consoles, tabId, {
      level: "error",
      text:
        event.exceptionDetails.exception?.description ??
        event.exceptionDetails.text,
    });
  else if (method === "Network.requestWillBeSent" && event.requestId)
    pending.set(event.requestId, {
      url: event.request?.url ?? "",
      method: event.request?.method ?? "GET",
    });
  else if (method === "Network.responseReceived" && event.response) {
    if (event.response.status >= 400)
      push(failures, tabId, {
        url: event.response.url,
        method: request?.method ?? "GET",
        status: event.response.status,
      });
  } else if (method === "Network.loadingFailed" && request) {
    if (!event.canceled)
      push(failures, tabId, { ...request, error: event.errorText });
    pending.delete(event.requestId ?? "");
  } else if (method === "Network.loadingFinished")
    pending.delete(event.requestId ?? "");
};

export function startLogs() {
  chrome.debugger.onEvent.addListener((source, method, params) => {
    if (source.tabId) handle(source.tabId, method, (params ?? {}) as Event);
  });
  chrome.debugger.onDetach.addListener((source) => {
    if (source.tabId) clearLogs(source.tabId);
  });
}
