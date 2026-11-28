// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const androidChrome = "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";

function setUserAgent(value: string) {
  Object.defineProperty(navigator, "userAgent", { configurable: true, value });
}

function installPromptEvent(outcome: "accepted" | "dismissed") {
  const prompt = vi.fn().mockResolvedValue(undefined);
  const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
    prompt, userChoice: Promise.resolve({ outcome }),
  });
  return { event, prompt };
}

// The store lives at module level, so every test starts from a fresh copy of it.
async function load() {
  vi.resetModules();
  return import("./index");
}

beforeEach(() => {
  localStorage.clear();
  setUserAgent(androidChrome);
});
afterEach(() => {
  cleanup();
  Reflect.deleteProperty(navigator, "userAgent");
});

it("reports the install options of the device and shows the hint until it is seen", async () => {
  const { useInstall } = await load();
  const { result } = renderHook(() => useInstall());
  expect(result.current).toMatchObject({ kind: "android", canPrompt: false, seen: false });

  act(() => result.current.markSeen());
  expect(result.current.seen).toBe(true);
  expect(localStorage.getItem("install-hint-seen")).toBe("1");
});

it("keeps the browser prompt and opens it on request", async () => {
  const { useInstall } = await load();
  const { result } = renderHook(() => useInstall());
  const { event, prompt } = installPromptEvent("accepted");

  act(() => { window.dispatchEvent(event); });
  expect(event.defaultPrevented).toBe(true);
  expect(result.current.canPrompt).toBe(true);

  let accepted: boolean | undefined;
  await act(async () => { accepted = await result.current.install(); });
  expect(prompt).toHaveBeenCalledOnce();
  expect(accepted).toBe(true);
  expect(result.current.canPrompt).toBe(false);
});

it("reports a refused prompt and does nothing without one", async () => {
  const { useInstall } = await load();
  const { result } = renderHook(() => useInstall());
  expect(await result.current.install()).toBe(false);

  act(() => { window.dispatchEvent(installPromptEvent("dismissed").event); });
  let accepted: boolean | undefined;
  await act(async () => { accepted = await result.current.install(); });
  expect(accepted).toBe(false);
});

it("stops offering the install once the browser says the app was installed", async () => {
  const { useInstall } = await load();
  const { result } = renderHook(() => useInstall());
  act(() => { window.dispatchEvent(new Event("appinstalled")); });
  expect(result.current.kind).toBe("installed");
});

it("does not offer the install when the app already runs installed", async () => {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("standalone") }));
  const { useInstall } = await load();
  const { result } = renderHook(() => useInstall());
  expect(result.current.kind).toBe("installed");
  vi.unstubAllGlobals();
});
