import { Pairing, type SessionRecord } from "@sessions/shared";

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
    id: Pairing.generateId(),
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
  if (!tab?.groupId || tab.groupId < 0)
    throw new Error("This tab isn't in a group. Group it first, then share.");
  const groupId = tab.groupId;
  if ((await read()).some((r) => r.groupId === groupId))
    throw new Error("Already shared");
  const group = await chrome.tabGroups.get(groupId);
  const record: SessionRecord = {
    id: Pairing.generateId(),
    kind: "group",
    title: group.title || "group",
    groupId: tab.groupId,
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
