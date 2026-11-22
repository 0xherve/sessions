import { loadBrowsers } from "../state";
import { connect } from "./client";

const since = (at: number) => {
  const seconds = Math.round((Date.now() - at) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

export async function status(options: { json?: boolean }) {
  let state: "running" | "offline";
  try {
    const { close } = await connect();
    close();
    state = "running";
  } catch {
    state = "offline";
  }

  const browsers = await loadBrowsers();

  if (options.json) {
    console.log(JSON.stringify({ service: state, browsers }, null, 2));
    return;
  }

  const entries = Object.entries(browsers);
  if (!entries.length) {
    console.log("no browsers paired yet");
    console.log(`${"service".padEnd(11)}${state}`);
    return;
  }

  const idWidth = Math.max(...entries.map(([id]) => id.length));
  for (const [id, profile] of entries) {
    console.log(
      `${profile.browser.padEnd(10)} ${id.padEnd(idWidth)}   paired ${since(profile.paired_at)}`,
    );
  }
  console.log("");
  console.log(`${"Sessions Service".padEnd(18)}${state}`);
}
