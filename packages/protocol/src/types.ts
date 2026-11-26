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

export type HelloParams = { profileId: string };
export type HelloResult = { challenge: string };

export type AuthParams = { signature: string };

export type AgentHelloParams = { name: string };

export type SessionUseParams = { sessionId: string };

export type SessionReleaseParams = { sessionId: string };

export type SessionAction =
  | { action: "snapshot" }
  | { action: "navigate"; url: string }
  | { action: "navigate_back" }
  | { action: "click"; ref: string }
  | { action: "type"; ref: string; text: string; submit?: boolean }
  | { action: "select"; ref: string; values: string[] }
  | { action: "press_key"; key: string }
  | { action: "screenshot" }
  | { action: "evaluate"; expression: string };

export type SessionActionResult =
  | { snapshot: string }
  | { image: string }
  | { value: unknown };

export type SessionCommandParams = {
  sessionId: string;
  command: SessionAction;
};

export type Tab = {
  id: number;
  url: string;
  title: string;
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
