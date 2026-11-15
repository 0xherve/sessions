export type Action = { type: "pair"; code: string };

export type State = {
  connection: "unpaired" | "connecting" | "online";
  error: string | null;
};
