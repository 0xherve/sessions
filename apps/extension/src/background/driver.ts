import type { SessionCommandParams, SessionRecord } from "@sessions/protocol";
import { allowed, loadPolicy, normalizeOrigin } from "./policy";
import { shared } from "./sessions";

const attached = new Set<number>();

const allowedMethod = /^(Page|Runtime|Emulation)\./;

const send = (
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

const attach = async (tabId: number) => {
  if (attached.has(tabId)) return;
  await new Promise<void>((resolve, reject) => {
    chrome.debugger.attach({ tabId }, "1.3", () => {
      const error = chrome.runtime.lastError;
      if (error) reject(new Error(error.message));
      else resolve();
    });
  });
  attached.add(tabId);
};

const targetOf = async (sessionId: string) => {
  const record = (await shared()).find((r) => r.id === sessionId);
  if (!record) throw new Error("No such session");
  if (record.kind === "tab") {
    if (!record.tabId) throw new Error("The shared tab is gone.");
    return record.tabId;
  }
  const [tab] = await chrome.tabs.query({
    groupId: record.groupId,
    active: true,
  });
  if (!tab?.id) throw new Error("The group has no open tabs.");
  return tab.id;
};

export async function runCommand({ sessionId, command }: SessionCommandParams) {
  if (typeof command?.method !== "string")
    throw new Error("Bad session command");
  if (!allowedMethod.test(command.method))
    throw new Error(`${command.method} isn't allowed for agents`);
  const tabId = await targetOf(sessionId);
  if (command.method === "Page.navigate") {
    const url = (command.params as { url?: string } | undefined)?.url ?? "";
    const policy = await loadPolicy();
    if (!allowed(policy, normalizeOrigin(url)))
      throw new Error("Agents may only open allowed origins.");
  }
  if (
    command.method === "Runtime.evaluate" ||
    command.method === "Page.captureScreenshot"
  ) {
    const tab = await chrome.tabs.get(tabId);
    const policy = await loadPolicy();
    if (!allowed(policy, normalizeOrigin(tab.url ?? "")))
      throw new Error("Agents may only inspect allowed origins.");
  }
  await attach(tabId);
  return await send(tabId, command.method, command.params);
}

const detach = (tabId: number) =>
  new Promise<void>((resolve, reject) => {
    chrome.debugger.detach({ tabId }, () => {
      const error = chrome.runtime.lastError;
      if (error) reject(new Error(error.message));
      else resolve();
    });
  });

export const detachSession = async (record: SessionRecord) => {
  const tabIds =
    record.kind === "tab"
      ? [record.tabId]
      : (await chrome.tabs.query({ groupId: record.groupId })).map((t) => t.id);
  for (const tabId of tabIds)
    if (tabId !== undefined && attached.has(tabId))
      await detach(tabId).catch(() => {});
};

export function startDriver(onDetach: (tabId: number) => void) {
  chrome.debugger.onDetach.addListener((source) => {
    if (!source.tabId) return;
    attached.delete(source.tabId);
    onDetach(source.tabId);
  });
}
