import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { generateId, type Profile } from "@sessions/shared";

const stateFile = join(homedir(), ".sessions", "profiles.json");
const pidFile = join(homedir(), ".sessions", "service.pid");

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
  const id = generateId();
  browsers[id] = { ...profile, public_key: publicKey, paired_at: Date.now() };
  await saveBrowsers(browsers);
  return id;
}

export async function writeServicePid(pid: number) {
  await mkdir(join(homedir(), ".sessions"), { recursive: true });
  await writeFile(pidFile, String(pid));
}

export async function readServicePid(): Promise<number | undefined> {
  try {
    const pid = Number((await readFile(pidFile, "utf8")).trim());
    return Number.isInteger(pid) && pid > 0 ? pid : undefined;
  } catch {
    return undefined;
  }
}

export const clearServicePid = () => rm(pidFile, { force: true });
