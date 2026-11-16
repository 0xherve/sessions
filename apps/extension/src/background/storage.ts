import { Pairing } from "@sessions/protocol";

type Stored = { profileId: string; jwk: JsonWebKey };

export async function loadIdentity() {
  const { stored } = await chrome.storage.local.get<{ stored?: Stored }>("stored");
  const identity = await Pairing.identity(stored?.jwk);
  if (stored) return { profileId: stored.profileId, identity };
  const created: Stored = { profileId: crypto.randomUUID(), jwk: identity.jwk };
  await chrome.storage.local.set({ stored: created });
  return { profileId: created.profileId, identity };
}
