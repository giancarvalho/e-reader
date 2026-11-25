import { createHash } from "node:crypto";
import { afterEach, expect, it, vi } from "vitest";
import { decodeGoogleFlow, encodeGoogleFlow, exchangeGoogleCode, getGoogleConfig, googleAuthorizationUrl, newGoogleFlow } from "./google";

const origin = "https://margins.example";
const env = { GOOGLE_CLIENT_ID: "test-client.apps.googleusercontent.com", GOOGLE_CLIENT_SECRET: "test-secret" };
const config = getGoogleConfig(env, origin)!;

afterEach(vi.unstubAllGlobals);

it("points Google directly at the app and binds the flow with PKCE, state and nonce", () => {
  const flow = newGoogleFlow();
  const url = new URL(googleAuthorizationUrl(config, flow));
  expect(url.origin).toBe("https://accounts.google.com");
  expect(url.searchParams.get("redirect_uri")).toBe(origin + "/auth/google/callback");
  expect(url.searchParams.get("state")).toBe(flow.state);
  expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  expect(url.searchParams.get("code_challenge")).toBe(createHash("sha256").update(flow.verifier).digest("base64url"));
  expect(url.searchParams.get("nonce")).toBe(createHash("sha256").update(flow.nonce).digest("hex"));
  expect(url.searchParams.has("client_secret")).toBe(false);
  expect(decodeGoogleFlow(encodeGoogleFlow(flow))).toEqual(flow);
  expect(decodeGoogleFlow("invalid-cookie")).toBeNull();
});

it("exchanges the code server-side with the same callback and returns the raw nonce for Supabase", async () => {
  const flow = newGoogleFlow();
  const fetchMock = vi.fn().mockResolvedValue(Response.json({ id_token: "id-token", access_token: "access-token" }));
  vi.stubGlobal("fetch", fetchMock);
  await expect(exchangeGoogleCode(config, flow, "the-code")).resolves.toEqual({
    provider: "google", token: "id-token", access_token: "access-token", nonce: flow.nonce,
  });
  const [url, options] = fetchMock.mock.calls[0];
  expect(url).toBe("https://oauth2.googleapis.com/token");
  expect(Object.fromEntries(options.body)).toMatchObject({
    client_secret: "test-secret",
    redirect_uri: origin + "/auth/google/callback",
    code: "the-code",
    code_verifier: flow.verifier,
  });
});
