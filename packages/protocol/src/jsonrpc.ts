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
  id: Id | null;
  error: ErrorObject;
};

export type Response<R = unknown> = SuccessResponse<R> | ErrorResponse;

export type Message<M extends string = string, P = unknown, R = unknown> =
  | Request<M, P>
  | Notification<M, P>
  | Response<R>;
