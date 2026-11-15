const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const CODE_LENGTH = 8;

const subtle = globalThis.crypto.subtle;
const text = new TextEncoder();

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const fromBase64Url = (value: string): Uint8Array<ArrayBuffer> => {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const randomBytes = (length: number) =>
  globalThis.crypto.getRandomValues(new Uint8Array(new ArrayBuffer(length)));

/** Random challenge: 16 bytes, url-safe text. */
export const nonce = () => toBase64Url(randomBytes(16));

/** 8 characters the user can read over a shoulder and type without mistakes. */
export function generateCode(): string {
  return Array.from(randomBytes(CODE_LENGTH), (b) => ALPHABET[b & 31]).join("");
}

/** Canonical form of a typed code: dashes and spaces dropped, I/L read as 1 and O as 0. */
export function normalizeCode(input: string): string | undefined {
  const code = input
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/[IL]/g, "1")
    .replace(/O/g, "0");
  return code.length === CODE_LENGTH &&
    [...code].every((c) => ALPHABET.includes(c))
    ? code
    : undefined;
}

export const formatCode = (code: string) =>
  `${code.slice(0, 4)}-${code.slice(4)}`;

export type Identity = {
  publicKey: string;
  /** Proof, produced with the private key, that only this identity can make. */
  sign(message: string): Promise<string>;
};

export async function identity(): Promise<Identity> {
  const pair = await subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign", "verify"],
  );
  const publicKey = toBase64Url(
    new Uint8Array(await subtle.exportKey("raw", pair.publicKey)),
  );
  return {
    publicKey,
    async sign(message) {
      const signature = await subtle.sign(
        { name: "ECDSA", hash: "SHA-256" },
        pair.privateKey,
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
