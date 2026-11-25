// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { Avatar } from "./Avatar";

afterEach(cleanup);

it("uses decorative initials for an avatar outside the allowed host", () => {
  const { container } = render(<Avatar name="Ana Lima" src="https://example.test/photo.png" />);
  expect(screen.getByText("AL").getAttribute("aria-hidden")).toBe("true");
  expect(container.querySelector("img")).toBeNull();
});
