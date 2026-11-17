import { browsers } from "../state";
import { connect } from "./client";

export async function status(options: { json?: boolean }) {
  let service: "running" | "offline";
  try {
    const { peer, close } = await connect();
    close();
    service = "running";
  } catch {
    service = "offline";
  }

  if (options.json) {
    console.log(JSON.stringify({ service, browsers }, null, 2));
    return;
  }

  const names = Object.values(browsers).map(
    (b) => `${b.profile.browser} (${b.profile.id.slice(0, 4)})`,
  );
  console.log(names.length ? `paired browsers: ${names.join(", ")}` : "no browsers paired yet");
  console.log(`service: ${service}`);
}
