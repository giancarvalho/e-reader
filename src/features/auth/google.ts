import { createHash, randomBytes } from "node:crypto";

export const googleFlowCookie = "google_oauth_flow";
export const googleFlowPath = "/auth/google";
export const googleFlowLifetime = 600;

type GoogleFlow = { state: string; verifier: string; nonce: string };
type GoogleConfig = { clientId: string; clientSecret: string; redirectUri: string };

export function hasGoogleCredentials(env: Readonly<Record<string, string | undefined>>) {
  return Boolean(env.GOOGLE_CLIENT_ID?.trim() || env.GOOGLE_CLIENT_SECRET?.trim());
}

export function getGoogleConfig(env: Readonly<Record<string, string | undefined>>, origin: string): GoogleConfig | null {
  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, redirectUri: new URL("/auth/google/callback", origin).href };
}

export function newGoogleFlow(): GoogleFlow {
  const random = () => randomBytes(32).toString("base64url");
  return { state: random(), verifier: random(), nonce: random() };
}

export function encodeGoogleFlow(flow: GoogleFlow) {
  return Buffer.from(JSON.stringify(flow)).toString("base64url");
}

export function decodeGoogleFlow(value: string | undefined): GoogleFlow | null {
  if (!value || value.length > 256) return null;
  try {
    const { state, verifier, nonce } = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    const valid = (field: unknown): field is string =>
      typeof field === "string" && /^[A-Za-z0-9_-]{43}$/.test(field);
    return valid(state) && valid(verifier) && valid(nonce) ? { state, verifier, nonce } : null;
  } catch {
    return null;
  }
}

export function googleAuthorizationUrl(config: GoogleConfig, flow: GoogleFlow) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: flow.state,
    code_challenge: createHash("sha256").update(flow.verifier).digest("base64url"),
    code_challenge_method: "S256",
    // Supabase hashes the raw nonce before comparing it to Google's token claim.
    nonce: createHash("sha256").update(flow.nonce).digest("hex"),
  }).toString();
  return url.href;
}

export async function exchangeGoogleCode(config: GoogleConfig, flow: GoogleFlow, code: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      code,
      code_verifier: flow.verifier,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return null;
  const { id_token, access_token } = await response.json();
  if (typeof id_token !== "string" || !id_token || typeof access_token !== "string" || !access_token) return null;
  return { provider: "google" as const, token: id_token, access_token, nonce: flow.nonce };
}
