// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { BookCover } from "./BookCover";

afterEach(cleanup);

it("renders a decorative cover or visual title fallback", () => {
  const { container, rerender } = render(<BookCover src="/cover.png" title="Ficção" />);
  expect(container.querySelector("img")?.alt).toBe("");
  expect(screen.queryByRole("img")).toBeNull();
  rerender(<BookCover title="Ficção" />);
  expect(screen.getByText("Ficção")).toBeTruthy();
});
