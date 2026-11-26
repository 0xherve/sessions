import { REQUEST_TIMEOUT_MS } from "@sessions/shared";
import { clearServicePid } from "../state";
import { connect } from "./client";

const STOP_TIMEOUT_MS = 5000;
const STOP_POLL_MS = 100;

export async function stop() {
  const hub = await connect().catch(() => undefined);
  if (!hub) {
    await clearServicePid();
    console.log("service is not running");
    return;
  }
  try {
    await hub.peer.request("service.stop", {}, REQUEST_TIMEOUT_MS);
  } finally {
    hub.close();
  }
  const deadline = Date.now() + STOP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const probe = await connect().catch(() => undefined);
    if (!probe) {
      console.log("stopped the service");
      return;
    }
    probe.close();
    await Bun.sleep(STOP_POLL_MS);
  }
  throw new Error("service did not stop in time");
}
