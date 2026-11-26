import { expect, it } from "vitest";
import { formatDateTime, formatPercent } from "./index";

it("formats a fraction as a pt-BR percentage", () => {
  expect(formatPercent(0.4).replace(/\s/g, "")).toBe("40%");
  expect(formatPercent(0).replace(/\s/g, "")).toBe("0%");
  expect(formatPercent(1).replace(/\s/g, "")).toBe("100%");
});

it("formats a timestamp as a short pt-BR date and time", () => {
  const value = new Date(2026, 10, 26, 14, 30);
  expect(formatDateTime(value)).toMatch(/26\/11\/2026.*14:30/);
  expect(formatDateTime(value.toISOString())).toBe(formatDateTime(value));
});
