export type Tab = {
  id: number;
  url: string;
  title: string;
};

export type SessionKind = "tab" | "group";

export type Session = {
  id: string;
  kind: SessionKind;
  tabIds: number[];
};

export type Profile = {
  id: string;
  browser: string;
  binary?: string;
  profileDir?: string;
};

export type OpenTabParams = { sessionId: string; url: string };

export type CdpSendParams = {
  sessionId: string;
  tabId: number;
  method: string;
  params?: Record<string, unknown>;
};

export type ServerMethods = {
  "tabs.list": { params: { sessionId: string }; result: Tab[] };
  "tabs.open": { params: OpenTabParams; result: Tab };
  "tabs.close": { params: { sessionId: string; tabId: number }; result: null };
  "cdp.attach": { params: { sessionId: string; tabId: number }; result: null };
  "cdp.detach": { params: { sessionId: string; tabId: number }; result: null };
  "cdp.send": { params: CdpSendParams; result: unknown };
};

export type PairParams = {
  profile: Profile;
  publicKey: string;
  code: string;
};

export type HelloParams = { profileId: string };
export type HelloResult = { challenge: string };

export type AuthParams = { signature: string };

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

export type ExtensionMethods = {
  pair: { params: PairParams; result: null };
  hello: { params: HelloParams; result: HelloResult };
  auth: { params: AuthParams; result: null };
};

export type ExtensionNotifications = {
  "session.shared": SessionSharedParams;
  "session.unshared": { sessionId: string };
  "cdp.event": CdpEventParams;
  "cdp.detached": CdpDetachedParams;
  "tabs.closed": { sessionId: string; tabId: number };
};
