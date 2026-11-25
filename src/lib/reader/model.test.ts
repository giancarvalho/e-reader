import { expect, it } from "vitest";
import { contrastRatio, reconcileRecord } from "./model";

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
