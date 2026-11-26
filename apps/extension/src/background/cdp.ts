import { clearLogs } from "./logs";

export const attached = new Set<number>();
export const refs = new Map<number, Map<string, number>>();

export const queues = new Map<number, Promise<void>>();

const LOAD_TIMEOUT_MS = 10_000;
const PROBE_TIMEOUT_MS = 2000;
const NAVIGATION_START_MS = 400;
const SETTLE_MS = 150;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const send = (
  tabId: number,
  method: string,
  params?: Record<string, unknown>,
) =>
  new Promise((resolve, reject) => {
    chrome.debugger.sendCommand({ tabId }, method, params ?? {}, (result) => {
      const error = chrome.runtime.lastError;
      if (error) reject(new Error(error.message));
      else resolve(result);
    });
  });

const isOurs = (tabId: number) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => resolve(false), PROBE_TIMEOUT_MS);
  });
  const probe = send(tabId, "Runtime.evaluate", { expression: "0" }).then(
    () => true,
    () => false,
  );
  return Promise.race([probe, timeout]).finally(() => clearTimeout(timer));
};

export const attach = (tabId: number) => {
  if (attached.has(tabId)) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    chrome.debugger.attach({ tabId }, "1.3", () => {
      const error = chrome.runtime.lastError;
      if (error) reject(new Error(error.message));
      else resolve();
    });
  })
    .catch(async (error: Error) => {
      if (!/already attached/i.test(error.message)) throw error;
      if (!(await isOurs(tabId)))
        throw new Error(
          "Another debugger is attached to this tab (close DevTools)",
        );
    })
    .then(async () => {
      await send(tabId, "Runtime.enable");
      await send(tabId, "Network.enable");
      attached.add(tabId);
    });
};

export const detach = (tabId: number) =>
  new Promise<void>((resolve, reject) => {
    refs.delete(tabId);
    attached.delete(tabId);
    clearLogs(tabId);
    chrome.debugger.detach({ tabId }, () => {
      const error = chrome.runtime.lastError;
      if (error) reject(new Error(error.message));
      else resolve();
    });
  });

export const afterLoad = async (
  tabId: number,
  action: () => Promise<unknown>,
  detectStart = false,
) => {
  await send(tabId, "Page.enable");
  await send(tabId, "Page.setLifecycleEventsEnabled", { enabled: true });
  const { frameTree } = (await send(tabId, "Page.getFrameTree")) as {
    frameTree: { frame: { id: string } };
  };
  const mainFrameId = frameTree.frame.id;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onStart = () => {};
  let onLoad = () => {};
  const started = new Promise<void>((resolve) => {
    onStart = resolve;
  });
  const loaded = new Promise<void>((resolve) => {
    onLoad = () => {
      clearTimeout(timer);
      resolve();
    };
    timer = setTimeout(onLoad, LOAD_TIMEOUT_MS);
  });
  const onEvent: Parameters<typeof chrome.debugger.onEvent.addListener>[0] = (
    source,
    method,
    params,
  ) => {
    if (source.tabId !== tabId) return;
    const p = (params ?? {}) as {
      frameId?: string;
      name?: string;
      type?: string;
      frame?: { parentId?: string };
    };
    if (
      method === "Page.frameStartedLoading" ||
      method === "Page.frameRequestedNavigation"
    ) {
      if (p.frameId === mainFrameId) onStart();
      return;
    }
    const done =
      method === "Page.loadEventFired" ||
      (method === "Page.navigatedWithinDocument" &&
        p.frameId === mainFrameId) ||
      (method === "Page.lifecycleEvent" &&
        p.name === "load" &&
        p.frameId === mainFrameId) ||
      (method === "Page.frameNavigated" &&
        p.type === "BackForwardCacheRestore" &&
        !p.frame?.parentId);
    if (done) {
      onStart();
      onLoad();
    }
  };
  chrome.debugger.onEvent.addListener(onEvent);
  try {
    await action();
    if (detectStart) {
      const navigating = await Promise.race([
        started.then(() => true),
        sleep(NAVIGATION_START_MS).then(() => false),
      ]);
      if (!navigating) {
        await sleep(SETTLE_MS);
        return;
      }
    }
    await loaded;
  } finally {
    clearTimeout(timer);
    chrome.debugger.onEvent.removeListener(onEvent);
  }
};
