export type Id = number | string;

export type Request<M extends string = string, P = unknown> = {
  jsonrpc: "2.0";
  id: Id;
  method: M;
  params: P;
};

export type Notification<M extends string = string, P = unknown> = {
  jsonrpc: "2.0";
  method: M;
  params: P;
};

export type ErrorObject = {
  code: number;
  message: string;
  data?: unknown;
};

export type SuccessResponse<R = unknown> = {
  jsonrpc: "2.0";
  id: Id;
  result: R;
};

export type ErrorResponse = {
  jsonrpc: "2.0";
  id: Id;
  error: ErrorObject;
};

export type Response<R = unknown> = SuccessResponse<R> | ErrorResponse;

export type Message<M extends string = string, P = unknown, R = unknown> =
  | Request<M, P>
  | Notification<M, P>
  | Response<R>;

export const ErrorCode = {
  ParseError: -32700,
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  InternalError: -32603,
  Application: -32000,
} as const;

export const isRequest = (m: Message): m is Request =>
  "method" in m && "id" in m;

export const isNotification = (m: Message): m is Notification =>
  "method" in m && !("id" in m);

export class RpcError extends Error {
  constructor(
    readonly code: number,
    message: string,
    readonly data?: unknown,
  ) {
    super(message);
  }

  static from(error: ErrorObject) {
    return new RpcError(error.code, error.message, error.data);
  }

  toObject(): ErrorObject {
    return {
      code: this.code,
      message: this.message,
      ...(this.data !== undefined ? { data: this.data } : {}),
    };
  }
}
