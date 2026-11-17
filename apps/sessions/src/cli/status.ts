import { loadBrowsers } from "../state";
import { connect } from "./client";

export async function status(options: { json?: boolean }) {
  let service: "running" | "offline";
  try {
    const { close } = await connect();
    close();
    service = "running";
  } catch {
    service = "offline";
  }

  const browsers = await loadBrowsers();

  if (options.json) {
    console.log(JSON.stringify({ service, browsers }, null, 2));
    return;
  }

  const names = Object.values(browsers).map(
    (profile) => `${profile.browser} (${profile.id})`,
  );
  console.log(
    names.length
      ? `paired browsers: ${names.join(", ")}`
      : "no browsers paired yet",
  );
  console.log(`service: ${service}`);
}
