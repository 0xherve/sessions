import {
  COMMAND_TIMEOUT_MS,
  REQUEST_TIMEOUT_MS,
  type SessionAction,
  type SessionActionResult,
  type SessionInfo,
} from "@sessions/shared";
import { withAgent } from "./agent";

export type Reply = { sessions?: SessionInfo[]; session?: SessionInfo };

const text = (result: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
});

const failure = (error: Error) => ({
  content: [{ type: "text" as const, text: error.message }],
  isError: true,
});

const render = (result: unknown) => {
  if (result && typeof result === "object") {
    if ("snapshot" in result)
      return {
        content: [{ type: "text" as const, text: String(result.snapshot) }],
      };
    if ("image" in result)
      return {
        content: [
          {
            type: "image" as const,
            data: String(result.image),
            mimeType: "image/png",
          },
        ],
      };
    if ("value" in result) return text(result.value ?? null);
  }
  return text(result);
};

export const call = async <T = Reply>(
  method: string,
  params: Record<string, unknown>,
  timeout = REQUEST_TIMEOUT_MS,
) => withAgent((peer) => peer.request(method, params, timeout)) as Promise<T>;

export const tool = (run: () => Promise<unknown>) => async () => {
  try {
    return render(await run());
  } catch (error) {
    return failure(error instanceof Error ? error : new Error(String(error)));
  }
};

let claimed: string | undefined;

export const getClaimed = () => claimed;

let ended: string | undefined;

export const setClaimed = (id: string | undefined) => {
  claimed = id;
  ended = undefined;
};

export const endClaimed = (reason?: string) => {
  claimed = undefined;
  ended = reason ? `session ended: ${reason}` : "session ended";
};

export const requireClaimed = () => {
  if (!claimed) {
    const message = ended ?? "no session claimed — call session_use first";
    ended = undefined;
    throw new Error(message);
  }
  return claimed;
};

export const command = (command: SessionAction) =>
  call<SessionActionResult>(
    "session.command",
    {
      sessionId: requireClaimed(),
      command,
    },
    COMMAND_TIMEOUT_MS,
  );
