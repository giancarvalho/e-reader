// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, expect, it } from "vitest";
import { Swatch } from "./Swatch";

afterEach(cleanup);

it("is decorative and exposes its tone", () => {
  const { container } = render(<Swatch tone="green" />);
  const swatch = container.querySelector("span")!;
  expect(swatch.getAttribute("aria-hidden")).toBe("true");
  expect(swatch.dataset.tone).toBe("green");
  expect(swatch.hasAttribute("data-selected")).toBe(false);
});

it("marks the selected swatch", () => {
  const { container } = render(<Swatch tone="pink" selected />);
  expect(container.querySelector("span")!.hasAttribute("data-selected")).toBe(true);
});

it("has no accessibility violations inside a labelled button", async () => {
  const { container } = render(<button aria-label="Rosa"><Swatch tone="pink" /></button>);
  expect((await axe.run(container, { runOnly: ["button-name", "aria-hidden-focus"] })).violations).toEqual([]);
});
