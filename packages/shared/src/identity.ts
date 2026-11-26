import { customAlphabet } from "nanoid";
import {
  CODE_ALPHABET,
  CODE_LENGTH,
  ID_ALPHABET,
  ID_LENGTH,
} from "./constants";

const idChars = customAlphabet(ID_ALPHABET, ID_LENGTH);

export const generateId = idChars;

const subtle = globalThis.crypto.subtle;
const text = new TextEncoder();

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

const fromBase64Url = (value: string): Uint8Array<ArrayBuffer> => {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const randomBytes = (length: number) =>
  globalThis.crypto.getRandomValues(new Uint8Array(new ArrayBuffer(length)));

export const nonce = () => toBase64Url(randomBytes(16));

export function generateCode(): string {
  return Array.from(
    randomBytes(CODE_LENGTH),
    (b) => CODE_ALPHABET[b & 31],
  ).join("");
}

export function normalizeCode(input: string): string | undefined {
  const code = input
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/[IL]/g, "1")
    .replace(/O/g, "0");
  return code.length === CODE_LENGTH &&
    [...code].every((c) => CODE_ALPHABET.includes(c))
    ? code
    : undefined;
}

export const formatCode = (code: string) =>
  `${code.slice(0, 4)}-${code.slice(4)}`;

export type Identity = {
  jwk: JsonWebKey;
  publicKey: string;
  sign(message: string): Promise<string>;
};

const importPublicRaw = async (jwk: JsonWebKey) => {
  const key = await subtle.importKey(
    "jwk",
    { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y },
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    [],
  );
  return toBase64Url(new Uint8Array(await subtle.exportKey("raw", key)));
};

export async function identity(stored?: JsonWebKey): Promise<Identity> {
  const jwk = (stored ??
    (await subtle.exportKey(
      "jwk",
      (
        await subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
          "sign",
          "verify",
        ])
      ).privateKey,
    ))) as JsonWebKey;
  const privateKey = await subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign"],
  );
  return {
    jwk,
    publicKey: await importPublicRaw(jwk),
    async sign(message) {
      const signature = await subtle.sign(
        { name: "ECDSA", hash: "SHA-256" },
        privateKey,
        text.encode(message),
      );
      return toBase64Url(new Uint8Array(signature));
    },
  };
}

export async function verify(
  publicKey: string,
  signature: string,
  message: string,
) {
  try {
    return await subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      await subtle.importKey(
        "raw",
        fromBase64Url(publicKey),
        { name: "ECDSA", namedCurve: "P-256" },
        false,
        ["verify"],
      ),
      fromBase64Url(signature),
      text.encode(message),
    );
  } catch {
    return false;
  }
}
