import { Pairing } from "@sessions/protocol";

export async function getIdentity(): Promise<Pairing.Identity> {
  const { jwk } = await chrome.storage.local.get<{ jwk?: JsonWebKey }>("jwk");
  if (jwk) return Pairing.identity(jwk);
  const identity = await Pairing.identity();
  await chrome.storage.local.set({ jwk: identity.jwk });
  return identity;
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
