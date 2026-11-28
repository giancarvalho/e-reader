import { expect, it } from "vitest";
import { contrastRatio, defaultPreferences, isDarkColor, normalizePreferences, reconcileRecord } from "./model";

it("keeps an edit made while a prior synchronization is in flight", () => {
  const sent = { value: "first", pending: "mutation-1", updatedAt: null };
  const current = { value: "newer", pending: "mutation-2", updatedAt: null };
  const reply = { value: "first", pending: null, updatedAt: "2026-11-25T12:00:00.000Z" };
  expect(reconcileRecord(current, sent, reply)).toBe(current);
  expect(reconcileRecord(sent, sent, reply)).toBe(reply);
  expect(reconcileRecord(sent, sent, undefined)).toBe(sent);
});

it("prevents an earlier remote state from replacing a more recent acknowledged write", () => {
  const newest = { value: "newer", pending: null, updatedAt: "2026-11-25T12:00:01.000Z" };
  const older = { value: "older", pending: null, updatedAt: "2026-11-25T12:00:00.000Z" };
  expect(reconcileRecord(newest, newest, older)).toBe(newest);
  expect(reconcileRecord(older, older, newest)).toBe(newest);
});

it("measures WCAG contrast symmetrically", () => {
  expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21);
  expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21);
  expect(contrastRatio("#2b2420", "#2b2420")).toBe(1);
  expect(contrastRatio("#faf5ec", "#2b2420")).toBeGreaterThan(4.5);
});

const stored = (theme: string, background = "#faf5ec", ink = "#2b2420") => ({ ...defaultPreferences, theme, background, ink });

it("turns the removed automatic theme into day or night, following the device once", () => {
  expect(normalizePreferences(stored("auto"), false).theme).toBe("day");
  expect(normalizePreferences(stored("auto"), true).theme).toBe("night");
});

it("turns the old Sépia, saved as a custom theme, into Pôr do Sol", () => {
  expect(normalizePreferences(stored("custom", "#EFDFC2", "#39271C"), false).theme).toBe("sunset");
  expect(normalizePreferences(stored("custom", "#101010", "#39271c"), false).theme).toBe("custom");
});

it("keeps current themes and falls back to day for unknown ones", () => {
  for (const theme of ["day", "sunset", "night", "midnight", "custom"]) {
    expect(normalizePreferences(stored(theme), true).theme).toBe(theme);
  }
  expect(normalizePreferences(stored("neon"), true).theme).toBe("day");
});

it("tells dark backgrounds from light ones", () => {
  expect(isDarkColor("#000000")).toBe(true);
  expect(isDarkColor("#17130f")).toBe(true);
  expect(isDarkColor("#efdfc2")).toBe(false);
});
