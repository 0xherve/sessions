import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { PROFILE_ID_LENGTH, type Profile } from "@sessions/protocol";
import { customAlphabet } from "nanoid";

const idChars = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  PROFILE_ID_LENGTH,
);

const stateFile = join(homedir(), ".sessions", "profiles.json");

export type PairedBrowser = Profile & {
  public_key: string;
  paired_at: number;
};

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
): Promise<string> {
  const browsers = await loadBrowsers();
  const id = idChars();
  browsers[id] = { ...profile, public_key: publicKey, paired_at: Date.now() };
  await saveBrowsers(browsers);
  return id;
}
