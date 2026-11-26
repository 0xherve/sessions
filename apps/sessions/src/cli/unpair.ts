import { REQUEST_TIMEOUT_MS } from "@sessions/shared";
import { loadBrowsers, saveBrowsers } from "../state";
import { connect } from "./client";

export async function unpair(id: string) {
  const browsers = await loadBrowsers();
  const browser = browsers[id];
  if (!browser) {
    console.log(`no paired browser ${id}`);
    console.log("run sessions status to see paired browsers");
    process.exitCode = 1;
    return;
  }
  const hub = await connect().catch(() => undefined);
  if (hub) {
    await hub.peer.request(
      "browser.unpair",
      { profileId: id },
      REQUEST_TIMEOUT_MS,
    );
    hub.close();
  } else {
    delete browsers[id];
    await saveBrowsers(browsers);
  }
  console.log(`unpaired: ${browser.browser} (${id})`);
  console.log("the browser can pair again with a new code");
}
