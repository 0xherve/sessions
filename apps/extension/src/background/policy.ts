type Policy = {
  mode: "controlled" | "unrestricted";
  allowedOrigins: string[];
};

const DEFAULT_POLICY: Policy = { mode: "unrestricted", allowedOrigins: [] };

export async function loadPolicy(): Promise<Policy> {
  const { policy } = await chrome.storage.local.get<{ policy?: Policy }>(
    "policy",
  );
  return policy ?? DEFAULT_POLICY;
}

export const savePolicy = (policy: Policy) =>
  chrome.storage.local.set({ policy });

export const normalizeOrigin = (input: string) => {
  try {
    return new URL(input).origin;
  } catch {
    return undefined;
  }
};

export const allowed = (policy: Policy, origin?: string) =>
  origin !== undefined &&
  (policy.mode === "unrestricted" || policy.allowedOrigins.includes(origin));
