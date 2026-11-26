import type {
  SessionAction,
  SessionRecord,
  Tab,
  TabAction,
} from "@sessions/shared";

const groupOf = (record: SessionRecord) => {
  if (record.kind !== "group" || record.groupId === undefined)
    throw new Error("This share is a single tab. Tab tools need a group share");
  if (record.groupId < 0) throw new Error("The shared group is gone.");
  return record.groupId;
};

const tabsOf = async (record: SessionRecord) => {
  if (record.kind === "group")
    return chrome.tabs.query({ groupId: groupOf(record) });
  if (record.tabId === undefined) throw new Error("The shared tab is gone.");
  return [await chrome.tabs.get(record.tabId)];
};

const list = async (record: SessionRecord): Promise<{ tabs: Tab[] }> => ({
  tabs: (await tabsOf(record)).map((tab) => ({
    id: tab.id ?? -1,
    url: tab.url ?? "",
    title: tab.title ?? "",
    active: tab.active,
  })),
});

const inGroup = async (tabId: number, groupId: number) => {
  const tab = await chrome.tabs.get(tabId).catch(() => undefined);
  if (tab?.groupId !== groupId)
    throw new Error(`Tab ${tabId} isn't in this session`);
  return tab;
};

export const isTabAction = (command: SessionAction): command is TabAction =>
  command.action.startsWith("tab_");

export async function runTabAction(record: SessionRecord, command: TabAction) {
  if (command.action === "tab_list") return list(record);
  const groupId = groupOf(record);
  const tabs = await tabsOf(record);
  if (command.action === "tab_new") {
    if (command.url && /^\s*javascript:/i.test(command.url))
      throw new Error("javascript: URLs aren't allowed");
    const [first] = tabs;
    if (!first) throw new Error("The shared group is gone.");
    const tab = await chrome.tabs.create({
      url: command.url,
      windowId: first.windowId,
      active: true,
    });
    if (tab.id === undefined) throw new Error("Chrome didn't open the tab.");
    await chrome.tabs.group({ groupId, tabIds: tab.id }).catch((error) => {
      void chrome.tabs.remove(tab.id ?? -1);
      throw error;
    });
    return list(record);
  }
  if (command.action === "tab_select") {
    await inGroup(command.tabId, groupId);
    await chrome.tabs.update(command.tabId, { active: true });
    return list(record);
  }
  if (command.action === "tab_close") {
    const tab = await inGroup(command.tabId, groupId);
    const next = tabs.find((t) => t.id !== command.tabId);
    if (next?.id === undefined)
      throw new Error(
        "This is the group's last tab. Closing it ends the session",
      );
    if (tab.active) await chrome.tabs.update(next.id, { active: true });
    await chrome.tabs.remove(command.tabId);
    return list(record);
  }
  throw new Error(`Unknown action ${(command as { action: string }).action}`);
}
