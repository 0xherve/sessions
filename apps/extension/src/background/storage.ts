import { Pairing } from "@sessions/protocol";

export async function getIdentity(): Promise<Pairing.Identity> {
  const { jwk } = await chrome.storage.local.get<{ jwk?: JsonWebKey }>("jwk");
  if (jwk) return Pairing.identity(jwk);
  const identity = await Pairing.identity();
  await chrome.storage.local.set({ jwk: identity.jwk });
  return identity;
}
