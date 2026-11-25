import { beforeEach, expect, it, vi } from "vitest";
import { joinGroup } from "./actions";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn((path: string) => { throw new Error(`redirect ${path}`); }),
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ getRequestAuth: mocks.auth }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ client: { rpc: mocks.rpc } });
});

function invitation() {
  const form = new FormData();
  form.set("code", "ABCDEFGH234567AB");
  return form;
}

it("redirects to the shelf only after the RPC confirms joining", async () => {
  mocks.rpc.mockReturnValue({ single: async () => ({ data: { status: "joined" }, error: null }) });
  await expect(joinGroup({}, invitation())).rejects.toThrow("redirect /estante");
  expect(mocks.rpc).toHaveBeenCalledWith("join_group", { code: "ABCDEFGH234567AB" });
});

it.each(["invalid_code", "rate_limited"])("returns the database error state %s", async (status) => {
  mocks.rpc.mockReturnValue({ single: async () => ({ data: { status }, error: null }) });
  await expect(joinGroup({}, invitation())).resolves.toEqual({ error: status });
});

it("preserves the form on a transient database error", async () => {
  mocks.rpc.mockReturnValue({ single: async () => ({ data: null, error: { code: "503" } }) });
  await expect(joinGroup({}, invitation())).resolves.toEqual({ error: "unavailable" });
});

it("requires a session when the RPC denies access", async () => {
  mocks.rpc.mockReturnValue({ single: async () => ({ data: null, error: { code: "42501" } }) });
  await expect(joinGroup({}, invitation())).rejects.toThrow("redirect /entrar");
});
