// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { isOnline, onConnectivityChange, onDisconnect, onReconnect, useOnline, useOnReconnect } from "./index";

function setOnline(value: boolean) {
  Object.defineProperty(navigator, "onLine", { configurable: true, get: () => value });
  window.dispatchEvent(new Event(value ? "online" : "offline"));
}

afterEach(() => {
  cleanup();
  setOnline(true);
});

it("reads the browser connection state", () => {
  setOnline(false);
  expect(isOnline()).toBe(false);
  setOnline(true);
  expect(isOnline()).toBe(true);
});

it("notifies on reconnect and stops after cleanup", () => {
  const callback = vi.fn();
  const stop = onReconnect(callback);
  setOnline(false);
  expect(callback).not.toHaveBeenCalled();
  setOnline(true);
  expect(callback).toHaveBeenCalledTimes(1);
  stop();
  setOnline(false);
  setOnline(true);
  expect(callback).toHaveBeenCalledTimes(1);
});

it("notifies on disconnect and on any change", () => {
  const lost = vi.fn();
  const changed = vi.fn();
  const stopLost = onDisconnect(lost);
  const stopChanged = onConnectivityChange(changed);
  setOnline(false);
  setOnline(true);
  expect(lost).toHaveBeenCalledTimes(1);
  expect(changed).toHaveBeenCalledTimes(2);
  stopLost();
  stopChanged();
});

it("keeps useOnline in sync with the browser", () => {
  const { result } = renderHook(() => useOnline());
  expect(result.current).toBe(true);
  act(() => setOnline(false));
  expect(result.current).toBe(false);
  act(() => setOnline(true));
  expect(result.current).toBe(true);
});

it("runs the latest useOnReconnect callback without resubscribing", () => {
  const first = vi.fn();
  const second = vi.fn();
  const { rerender } = renderHook(({ callback }) => useOnReconnect(callback), { initialProps: { callback: first } });
  rerender({ callback: second });
  act(() => setOnline(false));
  act(() => setOnline(true));
  expect(first).not.toHaveBeenCalled();
  expect(second).toHaveBeenCalledTimes(1);
});
