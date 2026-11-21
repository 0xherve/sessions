import {
  ErrorCode,
  type Id,
  isNotification,
  isRequest,
  type Message,
  RpcError,
} from "./jsonrpc";

export type PeerHandlers = {
  request?: (method: string, params: unknown) => unknown;
  notification?: (method: string, params: unknown) => void;
};

export type Peer = {
  request(
    method: string,
    params?: unknown,
    timeoutMs?: number,
  ): Promise<unknown>;
  notify(method: string, params?: unknown): void;
  receive(data: string): Promise<void>;
  close(reason: Error): void;
};

type Pending = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout> | undefined;
};

export const createPeer = (
  send: (data: string) => void,
  handlers: PeerHandlers = {},
): Peer => {
  let nextId = 1;
  const pending = new Map<Id, Pending>();
  let closed: Error | undefined;

  const reply = (id: Id | null, error?: RpcError, result: unknown = null) => {
    if (closed) return;
    send(
      JSON.stringify(
        error
          ? { jsonrpc: "2.0", id, error: error.toObject() }
          : { jsonrpc: "2.0", id, result },
      ),
    );
  };

  const receive = async (data: string): Promise<void> => {
    let message: Message;
    try {
      message = JSON.parse(data);
    } catch {
      return reply(null, new RpcError(ErrorCode.ParseError, "Invalid JSON"));
    }
    if (isRequest(message)) {
      const handle = handlers.request;
      if (!handle) return reply(message.id, methodNotFound(message.method));
      try {
        reply(
          message.id,
          undefined,
          await handle(message.method, message.params),
        );
      } catch (error) {
        reply(message.id, toRpcError(error));
      }
      return;
    }
    if (isNotification(message)) {
      handlers.notification?.(message.method, message.params);
      return;
    }
    const waiting = pending.get(message.id);
    if (!waiting) return;
    pending.delete(message.id);
    clearTimeout(waiting.timer);
    if ("error" in message) waiting.reject(RpcError.from(message.error));
    else waiting.resolve(message.result);
  };

  return {
    request(method: string, params: unknown = {}, timeoutMs?: number) {
      if (closed) return Promise.reject(closed);
      const id = nextId++;
      return new Promise((resolve, reject) => {
        const timer =
          timeoutMs === undefined
            ? undefined
            : setTimeout(() => {
                pending.delete(id);
                reject(new Error(`${method} timed out after ${timeoutMs} ms`));
              }, timeoutMs);
        pending.set(id, { resolve, reject, timer });
        send(JSON.stringify({ jsonrpc: "2.0", id, method, params }));
      });
    },

    notify(method: string, params: unknown = {}): void {
      if (closed) return;
      send(JSON.stringify({ jsonrpc: "2.0", method, params }));
    },

    receive,

    close(reason: Error): void {
      closed = reason;
      for (const { reject, timer } of pending.values()) {
        clearTimeout(timer);
        reject(reason);
      }
      pending.clear();
    },
  };
};

export const methodNotFound = (method: string) =>
  new RpcError(ErrorCode.MethodNotFound, `Unknown method ${method}`);

const toRpcError = (error: unknown) =>
  error instanceof RpcError
    ? error
    : new RpcError(
        ErrorCode.InternalError,
        error instanceof Error ? error.message : String(error),
      );
