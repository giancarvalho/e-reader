import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { signInWithGoogle } from "./actions";
import { decodeGoogleFlow } from "./google";

const mocks = vi.hoisted(() => ({
  set: vi.fn(),
  redirect: vi.fn((url: string): never => { throw new Error(url); }),
  getUser: vi.fn(),
  hosted: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: async () => ({ set: mocks.set, get: () => undefined }) }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/supabase/server", () => ({
  getRequestAuth: async () => ({
    config: { origin: "https://margins.example", secure: true },
    client: { auth: { getUser: mocks.getUser, signInWithOAuth: mocks.hosted } },
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: null } });
  vi.stubEnv("GOOGLE_CLIENT_ID", "test-client.apps.googleusercontent.com");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-secret");
});

afterEach(vi.unstubAllEnvs);

it("takes a signed-in reader straight to the group entry point", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: { id: "reader" } } });
  await expect(signInWithGoogle()).rejects.toThrow("/convite");
  expect(mocks.set).not.toHaveBeenCalled();
  expect(mocks.hosted).not.toHaveBeenCalled();
});

it("starts directly at Google and sets a short-lived flow cookie for the app callback", async () => {
  await expect(signInWithGoogle()).rejects.toThrow("https://accounts.google.com/");
  const location = new URL(mocks.redirect.mock.calls[0]![0]);
  const [name, cookieValue, options] = mocks.set.mock.calls[0]!;
  expect(name).toBe("google_oauth_flow");
  expect(options).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/auth/google" });
  expect(location.searchParams.get("redirect_uri")).toBe("https://margins.example/auth/google/callback");
  expect(location.searchParams.get("state")).toBe(decodeGoogleFlow(cookieValue)?.state);
  expect(mocks.hosted).not.toHaveBeenCalled();
});

it("keeps the hosted flow for existing environments until direct credentials are added", async () => {
  vi.stubEnv("GOOGLE_CLIENT_ID", "");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
  mocks.hosted.mockResolvedValue({ data: { url: "https://project.supabase.co/auth/v1/authorize" }, error: null });
  await expect(signInWithGoogle()).rejects.toThrow("https://project.supabase.co/");
  expect(mocks.hosted).toHaveBeenCalledWith({
    provider: "google",
    options: { redirectTo: "https://margins.example/auth/callback" },
  });
  expect(mocks.set).not.toHaveBeenCalled();
});

it("surfaces incomplete credentials without falling back to the hosted flow", async () => {
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
  await expect(signInWithGoogle()).rejects.toThrow("/entrar?status=unavailable");
  expect(mocks.hosted).not.toHaveBeenCalled();
});
