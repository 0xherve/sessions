import { Pairing } from "@sessions/protocol";

export type SessionRecord = {
  id: string;
  kind: "tab" | "group";
  title: string;
  tabId?: number;
  groupId?: number;
};

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
  const group = await chrome.tabGroups.get(tab.groupId);
  const record: SessionRecord = {
    id: Pairing.generateId(),
    kind: "group",
    title: group.title || "group",
    groupId: tab.groupId,
  };
  await write([...(await read()), record]);
  return record;
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
