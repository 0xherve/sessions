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

export type HelloParams = { publicKey: string };
export type HelloResult = { challenge: string };

export type PairParams = {
  profile: Profile;
  publicKey: string;
  code: string;
};

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
