import { NextRequest } from "next/server";
import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  getRequestAuth: async () => ({
    config: { origin: "https://margins.example", secure: true },
    client: { auth: { getUser: mocks.getUser }, rpc: mocks.rpc },
  }),
}));

const origin = "https://margins.example";
const code = "ABCDEFGH234567AB";

function request(sender = origin) {
  return new NextRequest("http://localhost:3000/auth/invite", {
    method: "POST",
    headers: { Origin: sender, Cookie: `shared_margins_invite=${code}` },
    body: JSON.stringify({ code }),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "reader" } }, error: null });
});

it("joins an authenticated reader and clears the consumed cookie", async () => {
  mocks.rpc.mockReturnValue({ single: async () => ({ data: { status: "joined" }, error: null }) });
  const response = await POST(request());
  expect(await response.json()).toEqual({ path: "/estante" });
  expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("join_group", { code });
  expect(response.cookies.get("shared_margins_invite")?.maxAge).toBe(0);
});

it("leaves redemption to OAuth when the reader is signed out", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
  expect((await POST(request())).status).toBe(401);
  expect(mocks.rpc).not.toHaveBeenCalled();
});

it("reports rejection from the invite RPC", async () => {
  mocks.rpc.mockReturnValue({ single: async () => ({ data: { status: "invalid_code" }, error: null }) });
  const response = await POST(request());
  expect(await response.json()).toEqual({ path: `/convite?codigo=${code}&status=invalid_code` });
});

it("checks the configured public origin before accessing the session or RPC", async () => {
  expect((await POST(request("https://other.example"))).status).toBe(403);
  expect(mocks.getUser).not.toHaveBeenCalled();
  expect(mocks.rpc).not.toHaveBeenCalled();
});
