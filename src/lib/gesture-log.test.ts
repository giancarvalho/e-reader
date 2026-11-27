// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { clearGestureLog, formatGestureReport, logGesture, readGestureLog } from "./gesture-log";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  clearGestureLog();
  vi.useRealTimers();
});

it("keeps entries in order, drops undefined fields and persists them", () => {
  logGesture("touchstart", { x: 10, y: 20, word: true, target: undefined });
  logGesture("touchend", { outcome: "tap" });
  vi.advanceTimersByTime(400);

  expect(readGestureLog().map(entry => entry.k)).toEqual(["touchstart", "touchend"]);
  expect(readGestureLog()[0]?.d).toEqual({ x: 10, y: 20, word: true });
  expect(JSON.parse(localStorage.getItem("e-reader-gesture-log") ?? "[]")).toHaveLength(2);
});

it("keeps only the most recent 400 entries", () => {
  for (let index = 0; index < 450; index += 1) logGesture("move", { index });
  const entries = readGestureLog();
  expect(entries).toHaveLength(400);
  expect(entries[0]?.d?.index).toBe(50);
});

it("clears memory and storage", () => {
  logGesture("touchstart");
  vi.advanceTimersByTime(400);
  clearGestureLog();
  expect(readGestureLog()).toEqual([]);
  expect(localStorage.getItem("e-reader-gesture-log")).toBeNull();
});

it("formats a readable report with relative times and the environment", () => {
  vi.setSystemTime(1_000);
  logGesture("touchstart", { x: 1, y: 2 });
  vi.setSystemTime(1_250);
  logGesture("touchend", { outcome: "dead" });
  const report = formatGestureReport(readGestureLog(), { app: "abc", standalone: true, missing: undefined }, new Date(2_000));

  expect(report).toContain("generated: 1970-01-01T00:00:02.000Z");
  expect(report).toContain("app: abc");
  expect(report).toContain("standalone: true");
  expect(report).not.toContain("missing");
  expect(report).toContain("+      0ms touchstart x=1 y=2");
  expect(report).toContain("+    250ms touchend outcome=dead");
});
