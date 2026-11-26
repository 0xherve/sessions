import { type Identity, identity } from "@sessions/shared";

export async function getIdentity(): Promise<Identity> {
  const { jwk } = await chrome.storage.local.get<{ jwk?: JsonWebKey }>("jwk");
  if (jwk) return identity(jwk);
  const fresh = await identity();
  await chrome.storage.local.set({ jwk: fresh.jwk });
  return fresh;
}

export async function getProfileId(): Promise<string | undefined> {
  const { profileId } = await chrome.storage.local.get<{ profileId?: string }>(
    "profileId",
  );
  return profileId;
}

export async function saveProfileId(profileId: string) {
  await chrome.storage.local.set({ profileId });
}

export async function getServiceKey(): Promise<string | undefined> {
  const { serviceKey } = await chrome.storage.local.get<{
    serviceKey?: string;
  }>("serviceKey");
  return serviceKey;
}

export async function saveServiceKey(serviceKey: string) {
  await chrome.storage.local.set({ serviceKey });
}
