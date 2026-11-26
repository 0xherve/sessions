import type {
  SessionAction,
  SessionActionResult,
  SessionCommandParams,
  SessionRecord,
} from "@sessions/shared";
import { afterLoad, attach, attached, detach, queues, refs, send } from "./cdp";
import { shared } from "./sessions";

const TEXT_ROLES = new Set(["StaticText", "InlineTextBox", "text"]);

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

type AXNode = {
  nodeId: string;
  childIds?: string[];
  ignored?: boolean;
  role?: { value?: string };
  name?: { value?: string };
  backendDOMNodeId?: number;
};

const renderTree = (tabId: number, nodes: AXNode[]) => {
  const byId = new Map(nodes.map((n) => [n.nodeId, n]));
  const tabRefs = new Map<string, number>();
  const lines: string[] = [];
  const visit = (node: AXNode, depth: number, parentName: string) => {
    const role = node.role?.value ?? "";
    const name = node.name?.value ?? "";
    const isText = TEXT_ROLES.has(role);
    const shown =
      !node.ignored &&
      !(isText && (!name.trim() || parentName.trim() === name.trim())) &&
      (name || (role && role !== "generic" && role !== "none"));
    if (shown) {
      let line = `${"  ".repeat(depth)}- ${role}`;
      if (name) line += ` ${JSON.stringify(name)}`;
      if (!isText && node.backendDOMNodeId !== undefined) {
        const ref = `e${tabRefs.size + 1}`;
        tabRefs.set(ref, node.backendDOMNodeId);
        line += ` [ref=${ref}]`;
      }
      lines.push(line);
    }
    for (const id of node.childIds ?? []) {
      const child = byId.get(id);
      if (child) visit(child, shown ? depth + 1 : depth, name);
    }
  };
  if (nodes[0]) visit(nodes[0], 0, "");
  refs.set(tabId, tabRefs);
  return lines.join("\n");
};

const snapshot = async (tabId: number) => {
  const { nodes } = (await send(tabId, "Accessibility.getFullAXTree")) as {
    nodes: AXNode[];
  };
  return { snapshot: renderTree(tabId, nodes) };
};

const nodeOf = (tabId: number, ref: string) => {
  const backendNodeId = refs.get(tabId)?.get(ref);
  if (backendNodeId === undefined)
    throw new Error(`Unknown ref ${ref}, take a new snapshot`);
  return backendNodeId;
};

const KEYS: Record<string, { code: string; keyCode: number; text?: string }> = {
  Enter: { code: "Enter", keyCode: 13, text: "\r" },
  Escape: { code: "Escape", keyCode: 27 },
  Tab: { code: "Tab", keyCode: 9 },
  Backspace: { code: "Backspace", keyCode: 8 },
  ArrowLeft: { code: "ArrowLeft", keyCode: 37 },
  ArrowUp: { code: "ArrowUp", keyCode: 38 },
  ArrowRight: { code: "ArrowRight", keyCode: 39 },
  ArrowDown: { code: "ArrowDown", keyCode: 40 },
};

const pressKey = async (tabId: number, key: string) => {
  const known = KEYS[key];
  if (!known && [...key].length !== 1)
    throw new Error(`Unsupported key ${key}`);
  const event = known
    ? { key, code: known.code, windowsVirtualKeyCode: known.keyCode }
    : { key };
  const text = known ? known.text : key;
  await send(tabId, "Input.dispatchKeyEvent", {
    type: text ? "keyDown" : "rawKeyDown",
    ...event,
    text,
  });
  await send(tabId, "Input.dispatchKeyEvent", { type: "keyUp", ...event });
};

const click = async (tabId: number, backendNodeId: number) => {
  await send(tabId, "DOM.scrollIntoViewIfNeeded", { backendNodeId });
  const { model } = (await send(tabId, "DOM.getBoxModel", {
    backendNodeId,
  })) as { model: { content: number[] } };
  const center = (offset: number) =>
    model.content
      .filter((_, i) => i % 2 === offset)
      .reduce((a, b) => a + b, 0) / 4;
  const x = center(0);
  const y = center(1);
  const mouse = { x, y, button: "left", clickCount: 1 };
  await send(tabId, "Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  await send(tabId, "Input.dispatchMouseEvent", {
    type: "mousePressed",
    ...mouse,
  });
  await send(tabId, "Input.dispatchMouseEvent", {
    type: "mouseReleased",
    ...mouse,
  });
};

const thrown = (result: unknown) => {
  const details = (
    result as {
      exceptionDetails?: { text: string; exception?: { description?: string } };
    }
  ).exceptionDetails;
  if (details) throw new Error(details.exception?.description ?? details.text);
};

const selectOptions = async (
  tabId: number,
  backendNodeId: number,
  values: string[],
) => {
  const { object } = (await send(tabId, "DOM.resolveNode", {
    backendNodeId,
  })) as { object: { objectId: string } };
  const result = await send(tabId, "Runtime.callFunctionOn", {
    objectId: object.objectId,
    functionDeclaration: `function (values) {
      if (!(this instanceof HTMLSelectElement)) throw new Error("Not a select element");
      for (const option of this.options)
        option.selected = values.includes(option.value) || values.includes(option.label);
      this.dispatchEvent(new Event("input", { bubbles: true }));
      this.dispatchEvent(new Event("change", { bubbles: true }));
    }`,
    arguments: [{ value: values }],
  });
  thrown(result);
};

const navigate = async (tabId: number, url: string) => {
  if (/^\s*javascript:/i.test(url))
    throw new Error("javascript: URLs aren't allowed");
  await afterLoad(tabId, async () => {
    const { errorText } = (await send(tabId, "Page.navigate", { url })) as {
      errorText?: string;
    };
    if (errorText) throw new Error(errorText);
  });
};

const navigateBack = async (tabId: number) => {
  const { currentIndex, entries } = (await send(
    tabId,
    "Page.getNavigationHistory",
  )) as { currentIndex: number; entries: { id: number }[] };
  const previous = entries[currentIndex - 1];
  if (!previous) throw new Error("There is no previous page");
  await afterLoad(tabId, () =>
    send(tabId, "Page.navigateToHistoryEntry", { entryId: previous.id }),
  );
};

const perform = async (
  tabId: number,
  command: SessionAction,
): Promise<SessionActionResult> => {
  switch (command.action) {
    case "snapshot":
      return snapshot(tabId);
    case "click":
      await afterLoad(
        tabId,
        () => click(tabId, nodeOf(tabId, command.ref)),
        true,
      );
      return snapshot(tabId);
    case "type":
      await send(tabId, "DOM.focus", {
        backendNodeId: nodeOf(tabId, command.ref),
      });
      await send(tabId, "Input.insertText", { text: command.text });
      if (command.submit)
        await afterLoad(tabId, () => pressKey(tabId, "Enter"), true);
      return snapshot(tabId);
    case "select":
      await selectOptions(tabId, nodeOf(tabId, command.ref), command.values);
      return snapshot(tabId);
    case "press_key":
      await afterLoad(tabId, () => pressKey(tabId, command.key), true);
      return snapshot(tabId);
    case "navigate":
      await navigate(tabId, command.url);
      return snapshot(tabId);
    case "navigate_back":
      await navigateBack(tabId);
      return snapshot(tabId);
    case "screenshot": {
      const { data } = (await send(tabId, "Page.captureScreenshot", {
        format: "png",
      })) as { data: string };
      return { image: data };
    }
    case "evaluate": {
      const result = await send(tabId, "Runtime.evaluate", {
        expression: command.expression,
        returnByValue: true,
        awaitPromise: true,
      });
      thrown(result);
      const { value, unserializableValue } = (
        result as {
          result: { value?: unknown; unserializableValue?: string };
        }
      ).result;
      return { value: value ?? unserializableValue ?? null };
    }
    default:
      throw new Error(
        `Unknown action ${(command as { action?: string }).action}`,
      );
  }
};

export async function runCommand({
  sessionId,
  command,
}: SessionCommandParams): Promise<SessionActionResult> {
  const tabId = await targetOf(sessionId);
  const run = (queues.get(tabId) ?? Promise.resolve()).then(async () => {
    await attach(tabId);
    return perform(tabId, command);
  });
  const tail = run.then(
    () => {},
    () => {},
  );
  queues.set(tabId, tail);
  tail.then(() => {
    if (queues.get(tabId) === tail) queues.delete(tabId);
  });
  return run;
}

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
    refs.delete(source.tabId);
    onDetach(source.tabId);
  });
}
