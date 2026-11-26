import { spawn } from "node:child_process";
import { closeSync, mkdirSync, openSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  createPeer,
  type Peer,
  SERVICE_HOST,
  SERVICE_PORT,
} from "@sessions/shared";
import {
  type Connection,
  handle,
  handleNotification,
  register,
  release,
} from "../service";
import { clearServicePid, writeServicePid } from "../state";
import { connect } from "./client";

const running = () =>
  connect().then(
    (hub) => {
      hub.close();
      return true;
    },
    () => false,
  );

export async function start() {
  if (process.env.SESSIONS_SERVE) return serve();
  if (await running()) return "service is already running";
  const dir = join(homedir(), ".sessions");
  mkdirSync(dir, { recursive: true });
  const log = openSync(join(dir, "service.log"), "a");
  const script = Bun.main.startsWith("/$bunfs/") ? [] : [Bun.main];
  spawn(process.execPath, [...script, "start"], {
    detached: true,
    stdio: ["ignore", log, log],
    env: { ...process.env, SESSIONS_SERVE: "1" },
  }).unref();
  closeSync(log);
  for (let tries = 0; tries < 25; tries++) {
    await Bun.sleep(200);
    if (await running()) return "started the service";
  }
  throw new Error("service could not be started, see ~/.sessions/service.log");
}

async function serve() {
  const server = Bun.serve<Connection & { peer?: Peer }>({
    port: SERVICE_PORT,
    hostname: SERVICE_HOST,
    fetch: (request, server) => {
      const origin = request.headers.get("origin");
      if (origin !== null && !origin.startsWith("chrome-extension://"))
        return new Response("Forbidden", { status: 403 });
      return server.upgrade(request, { data: {} })
        ? undefined
        : new Response("Sessions service — for browsers and agents", {
            status: 404,
          });
    },
    websocket: {
      open(ws) {
        ws.data.close = () => ws.close();
        register(ws.data);
      },
      close(ws) {
        release(ws.data);
      },
      message(ws, data) {
        ws.data.peer ??= createPeer((out) => ws.send(out), {
          request: (method, params) => handle(ws.data, method, params),
          notification: (method, params) =>
            handleNotification(ws.data, method, params),
        });
        void ws.data.peer.receive(data.toString());
      },
    },
  });
  console.error(
    `Sessions service listening on ${SERVICE_HOST}:${SERVICE_PORT}`,
  );
  await writeServicePid(process.pid);

  const shutdown = () => {
    server.stop(true);
    void clearServicePid().then(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
