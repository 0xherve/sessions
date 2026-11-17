export type Action = { type: "pair"; code: string };

export type Phase = "unpaired" | "connecting" | "paired" | "online";

export type State = {
  connection: Phase;
  error: string | null;
};
