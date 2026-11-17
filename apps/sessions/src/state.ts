import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { ID_LENGTH, type Profile } from "@sessions/protocol";
import { nanoid } from "nanoid";

const stateFile = join(homedir(), ".sessions", "profiles.json");

export type PairedBrowser = Profile & { id: string; paired_at: number };

export async function loadBrowsers(): Promise<Record<string, PairedBrowser>> {
  try {
    return JSON.parse(await readFile(stateFile, "utf8"));
  } catch {
    return {};
  }
}

export async function saveBrowsers(browsers: Record<string, PairedBrowser>) {
  await mkdir(join(homedir(), ".sessions"), { recursive: true });
  await writeFile(stateFile, JSON.stringify(browsers, null, 2));
}

export async function addBrowser(
  publicKey: string,
  profile: Profile,
): Promise<PairedBrowser> {
  const browsers = await loadBrowsers();
  const paired: PairedBrowser = {
    ...profile,
    id: nanoid(ID_LENGTH),
    paired_at: Date.now(),
  };
  browsers[publicKey] = paired;
  await saveBrowsers(browsers);
  return paired;
}
