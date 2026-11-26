import { generateId, type SessionRecord } from "@sessions/shared";

const storage = chrome.storage.session;

const read = async (): Promise<SessionRecord[]> => {
  const { sessions } = await storage.get<{ sessions?: SessionRecord[] }>(
    "sessions",
  );
  return sessions ?? [];
};

const write = async (sessions: SessionRecord[]) => {
  await storage.set({ sessions });
};

export const shared = read;

export const shareTab = async (): Promise<SessionRecord> => {
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  if (!tab?.id) throw new Error("This tab can't be shared.");
  if (await sessionForTab(tab.id)) throw new Error("Already shared");
  const record: SessionRecord = {
    id: generateId(),
    kind: "tab",
    title: tab.title ?? "untitled",
    tabId: tab.id,
  };
  await write([...(await read()), record]);
  return record;
};

export const startGroup = async (): Promise<SessionRecord> => {
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  if (!tab?.id) throw new Error("This tab can't be shared.");
  if (await sessionForTab(tab.id)) throw new Error("Already shared");
  const groupId = await chrome.tabs.group({ tabIds: tab.id });
  await chrome.tabGroups.update(groupId, { title: "Sessions" });
  const record: SessionRecord = {
    id: generateId(),
    kind: "group",
    title: "Sessions",
    groupId,
  };
  await write([...(await read()), record]);
  return record;
};

export const unshare = async (id: string) => {
  await write((await read()).filter((r) => r.id !== id));
};

export const sessionForTab = async (tabId: number) => {
  let groupId: number | undefined;
  try {
    groupId = (await chrome.tabs.get(tabId)).groupId;
  } catch {
    return undefined;
  }
  return (await shared()).find(
    (r) =>
      r.tabId === tabId || (groupId !== undefined && r.groupId === groupId),
  );
};

export function startSessions(notify: { ended(session: SessionRecord): void }) {
  const drop = async (match: (r: SessionRecord) => boolean) => {
    const records = await read();
    const record = records.find(match);
    if (!record) return;
    await write(records.filter((r) => r.id !== record.id));
    notify.ended(record);
  };
  chrome.tabs.onRemoved.addListener((tabId) => drop((r) => r.tabId === tabId));
  chrome.tabGroups.onRemoved.addListener((group) =>
    drop((r) => r.groupId === group.id),
  );
}
