import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  generateId,
  type Identity,
  identity,
  type Profile,
} from "@sessions/shared";

const stateDir = join(homedir(), ".sessions");
const stateFile = join(stateDir, "profiles.json");
const pidFile = join(stateDir, "service.pid");
const keyFile = join(stateDir, "service.key");

let serviceKey: Promise<Identity> | undefined;

const loadServiceKey = async () => {
  try {
    return await identity(JSON.parse(await readFile(keyFile, "utf8")));
  } catch {
    const fresh = await identity();
    await mkdir(stateDir, { recursive: true });
    await chmod(stateDir, 0o700);
    await writeFile(keyFile, JSON.stringify(fresh.jwk), {
      mode: 0o600,
      flag: "wx",
    });
    return fresh;
  }
};

export const getServiceKey = () => {
  serviceKey ??= loadServiceKey();
  return serviceKey;
};

export type PairedBrowser = Profile & { paired_at: number };

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

export async function addBrowser(profile: Profile): Promise<string> {
  const browsers = await loadBrowsers();
  const id = generateId();
  browsers[id] = { ...profile, paired_at: Date.now() };
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
