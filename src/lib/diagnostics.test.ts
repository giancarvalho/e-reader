// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { observeDiagnostics, readDiagnostics, recordDiagnostic } from "./diagnostics";

afterEach(() => localStorage.clear());

it("keeps recent discrete failures and the current state per subsystem", () => {
  const changed = vi.fn();
  const unsubscribe = observeDiagnostics(changed);
  recordDiagnostic("reader", "error");
  recordDiagnostic("reader", "error");
  recordDiagnostic("reader", "ok");
  recordDiagnostic("comments", "error");
  expect(changed).toHaveBeenCalledTimes(4);
  unsubscribe();

  const result = readDiagnostics();
  expect(result.last.reader?.state).toBe("ok");
  expect(result.errors.map(entry => entry.system)).toEqual(["comments", "reader"]);
});

it("ignores invalid persisted diagnostics", () => {
  localStorage.setItem("e-reader-diagnostics", "{broken");
  expect(readDiagnostics()).toEqual({ last: {}, errors: [] });
});
