// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { fullscreenSupported, readFullscreenPreference, saveFullscreenPreference } from "./fullscreen";

beforeEach(() => localStorage.clear());
afterEach(() => Reflect.deleteProperty(document, "fullscreenEnabled"));

it("asks for full screen by default and remembers turning it off on this device", () => {
  expect(readFullscreenPreference()).toBe(true);
  saveFullscreenPreference(false);
  expect(readFullscreenPreference()).toBe(false);
  saveFullscreenPreference(true);
  expect(readFullscreenPreference()).toBe(true);
});

it("keeps working when storage is unavailable", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
  expect(readFullscreenPreference()).toBe(true);
  expect(() => saveFullscreenPreference(false)).not.toThrow();
  vi.restoreAllMocks();
});

it("reports whether the browser has the Fullscreen API", () => {
  expect(fullscreenSupported()).toBe(false);
  Object.defineProperty(document, "fullscreenEnabled", { value: true, configurable: true });
  expect(fullscreenSupported()).toBe(true);
});
