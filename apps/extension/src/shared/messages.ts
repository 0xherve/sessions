export type Action =
  | { type: "pair"; code: string }
  | { type: "share-tab" }
  | { type: "share-group" };

export type Phase = "unpaired" | "connecting" | "paired" | "online";

export type State = {
  connection: Phase;
  error: string | null;
};
