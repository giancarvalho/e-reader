import { NextRequest } from "next/server";
import { beforeEach, expect, it, vi } from "vitest";
import { finishGoogleSignIn } from "./callback";

const mocks = vi.hoisted(() => ({
  exchange: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  getRequestAuth: async () => ({
    config: { secure: true },
    client: { auth: { exchangeCodeForSession: mocks.exchange }, rpc: mocks.rpc },
  }),
}));

const invite = "ABCDEFGH234567AB";

function callback() {
  return finishGoogleSignIn(new NextRequest("https://margins.example/auth/callback?code=oauth-code", {
    headers: { Cookie: `shared_margins_invite=${invite}` },
  }));
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.exchange.mockResolvedValue({ error: null });
});

it("redeems the pending invite after the hosted OAuth exchange", async () => {
  mocks.rpc.mockReturnValue({ single: async () => ({ data: { status: "joined" }, error: null }) });
  const response = await callback();
  expect(mocks.exchange).toHaveBeenCalledWith("oauth-code");
  expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("join_group", { code: invite });
  expect(response.headers.get("location")).toBe("/estante");
  expect(response.cookies.get("shared_margins_invite")?.maxAge).toBe(0);
});

it("offers a retry with the same code when the join request fails after login", async () => {
  mocks.rpc.mockReturnValue({ single: async () => { throw new Error("connection failed"); } });
  const response = await callback();
  expect(response.headers.get("location")).toBe(`/convite?codigo=${invite}&status=unavailable`);
});
