export type Profile = {
  browser: string;
  binary?: string;
  profileDir?: string;
};

export type SessionKind = "tab" | "group";

export type SessionRecord = {
  id: string;
  kind: SessionKind;
  title: string;
  tabId?: number;
  groupId?: number;
};

export type SessionInfo = {
  id: string;
  kind: SessionKind;
  title: string;
  browser: string;
  claimed: boolean;
};

export type PairParams = {
  profile: Profile;
  publicKey: string;
  code: string;
};

export type PairResult = { id: string; publicKey: string };

export type HelloParams = { nonce: string };
export type HelloResult = { signature: string; challenge: string };

export type AuthParams = { profileId: string; signature: string };

export type BrowserUnpairParams = { profileId: string };

export type AgentHelloParams = { name: string };

export type SessionUseParams = { sessionId: string };

export type SessionReleaseParams = { sessionId: string };

export type ConsoleEntry = { level: string; text: string };

export type NetworkFailure = {
  url: string;
  method: string;
  status?: number;
  error?: string;
};

export type TabAction =
  | { action: "tab_list" }
  | { action: "tab_new"; url?: string }
  | { action: "tab_select"; tabId: number }
  | { action: "tab_close"; tabId: number };

export type SessionAction =
  | TabAction
  | { action: "snapshot" }
  | { action: "navigate"; url: string }
  | { action: "navigate_back" }
  | { action: "navigate_forward" }
  | { action: "reload" }
  | { action: "info" }
  | { action: "console" }
  | { action: "network" }
  | { action: "click"; ref: string }
  | { action: "type"; ref: string; text: string; submit?: boolean }
  | { action: "select"; ref: string; values: string[] }
  | { action: "upload"; ref: string; paths: string[] }
  | { action: "press_key"; key: string }
  | { action: "screenshot" }
  | { action: "evaluate"; expression: string };

export type SessionActionResult =
  | { snapshot: string }
  | { image: string }
  | { value: unknown }
  | { url: string; title: string }
  | { tabs: Tab[] }
  | { console: ConsoleEntry[] }
  | { failures: NetworkFailure[] };

export type SessionCommandParams = {
  sessionId: string;
  command: SessionAction;
};

export type Tab = {
  id: number;
  url: string;
  title: string;
  active: boolean;
};

export type Session = {
  id: string;
  kind: SessionKind;
  tabIds: number[];
};

export type OpenTabParams = { sessionId: string; url: string };

export type CdpSendParams = {
  sessionId: string;
  tabId: number;
  method: string;
  params?: Record<string, unknown>;
};

export type SessionSharedParams = { sessionId: string; tabIds: number[] };

export type CdpEventParams = {
  sessionId: string;
  tabId: number;
  method: string;
  params: unknown;
};

export type CdpDetachedParams = {
  sessionId: string;
  tabId: number;
  reason: string;
};
