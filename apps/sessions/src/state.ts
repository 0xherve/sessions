import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Profile } from "@sessions/protocol";

const stateFile = join(homedir(), ".sessions", "profiles.json");

export type PairedBrowser = { profile: Profile; publicKey: string };

export const browsers: Record<string, PairedBrowser> = await (async () => {
  try {
    return JSON.parse(await readFile(stateFile, "utf8"));
  } catch {
    return {};
  }
})();

export async function saveBrowsers() {
  await mkdir(join(homedir(), ".sessions"), { recursive: true });
  await writeFile(stateFile, JSON.stringify(browsers, null, 2));
}
