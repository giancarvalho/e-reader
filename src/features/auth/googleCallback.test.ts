import { NextRequest } from "next/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { encodeGoogleFlow, googleFlowCookie, newGoogleFlow } from "./google";
import { finishDirectGoogleSignIn } from "./googleCallback";

const signInWithIdToken = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({
  getRequestAuth: async () => ({
    config: { origin: "https://margins.example", secure: true },
    client: { auth: { signInWithIdToken } },
  }),
}));

beforeEach(() => {
  signInWithIdToken.mockReset().mockResolvedValue({ error: null });
  vi.stubEnv("GOOGLE_CLIENT_ID", "test-client.apps.googleusercontent.com");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-secret");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function callback(stateMatches = true) {
  const flow = newGoogleFlow();
  const url = new URL("https://margins.example/auth/google/callback");
  url.searchParams.set("code", "test-code");
  url.searchParams.set("state", stateMatches ? flow.state : "invalid");
  url.searchParams.set("next", "https://other.example");
  return {
    flow,
    request: new NextRequest(url, { headers: { Cookie: `${googleFlowCookie}=${encodeGoogleFlow(flow)}` } }),
  };
}

it("accepts the expected state, creates a Supabase session and takes the reader to the invite", async () => {
  const { flow, request } = callback();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ id_token: "id", access_token: "access" })));
  const response = await finishDirectGoogleSignIn(request);
  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe("/convite");
  expect(response.headers.get("set-cookie")).toContain("Path=/auth/google; Max-Age=0");
  expect(signInWithIdToken).toHaveBeenCalledWith({
    provider: "google", token: "id", access_token: "access", nonce: flow.nonce,
  });
});

it("rejects a different state before contacting either provider", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  const response = await finishDirectGoogleSignIn(callback(false).request);
  expect(response.headers.get("location")).toBe("/entrar?status=failed");
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(fetchMock).not.toHaveBeenCalled();
  expect(signInWithIdToken).not.toHaveBeenCalled();
});

it("returns to sign-in if the Google token endpoint is unavailable", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network failure")));
  const response = await finishDirectGoogleSignIn(callback().request);
  expect(response.headers.get("location")).toBe("/entrar?status=failed");
  expect(signInWithIdToken).not.toHaveBeenCalled();
});
