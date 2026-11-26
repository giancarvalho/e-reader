// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { getViewport, observeViewport } from "./viewport";

type Listener = () => void;

function mockVisualViewport(values: { offsetLeft: number; offsetTop: number; width: number; height: number }) {
  const listeners = new Map<string, Set<Listener>>();
  const visual = {
    ...values,
    addEventListener: (type: string, listener: Listener) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(listener);
    },
    removeEventListener: (type: string, listener: Listener) => listeners.get(type)?.delete(listener),
  };
  Object.defineProperty(window, "visualViewport", { configurable: true, value: visual });
  return { visual, emit: (type: string) => listeners.get(type)?.forEach(listener => listener()), listeners };
}

afterEach(() => {
  Reflect.deleteProperty(window, "visualViewport");
});

it("falls back to the window when the visual viewport is unavailable", () => {
  Object.defineProperty(window, "visualViewport", { configurable: true, value: undefined });
  expect(getViewport()).toEqual({ left: 0, top: 0, width: window.innerWidth, height: window.innerHeight, bottomInset: 0 });
});

it("reports the area left above the keyboard", () => {
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
  mockVisualViewport({ offsetLeft: 0, offsetTop: 0, width: 390, height: 500 });
  expect(getViewport()).toEqual({ left: 0, top: 0, width: 390, height: 500, bottomInset: 300 });
});

it("never reports a negative inset", () => {
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 600 });
  mockVisualViewport({ offsetLeft: 0, offsetTop: 50, width: 390, height: 600 });
  expect(getViewport().bottomInset).toBe(0);
});

it("notifies on visual viewport and window changes and stops after cleanup", () => {
  const { emit } = mockVisualViewport({ offsetLeft: 0, offsetTop: 0, width: 390, height: 700 });
  const callback = vi.fn();
  const stop = observeViewport(callback);
  emit("resize");
  emit("scroll");
  window.dispatchEvent(new Event("resize"));
  expect(callback).toHaveBeenCalledTimes(3);
  stop();
  emit("resize");
  window.dispatchEvent(new Event("resize"));
  expect(callback).toHaveBeenCalledTimes(3);
});
