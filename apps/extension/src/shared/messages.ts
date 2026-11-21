export type Action =
  | { type: "pair"; code: string }
  | { type: "share-tab" }
  | { type: "share-group" }
  | { type: "stop" };

export type Phase = "unpaired" | "connecting" | "paired" | "online";

export type Sharing = { tab: boolean; group: boolean };

export type State = {
  connection: Phase;
  error: string | null;
  sharing: Sharing;
};
