// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { Text } from "./Text";

afterEach(cleanup);

it("renders muted reading text as a paragraph", () => {
  render(<Text variant="reading" tone="muted">Leitura</Text>);
  const paragraph = screen.getByRole("paragraph");
  expect(paragraph.textContent).toBe("Leitura");
  expect(paragraph.dataset.variant).toBe("reading");
  expect(paragraph.dataset.tone).toBe("muted");
});
