// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, expect, it } from "vitest";
import { Icon, type IconName } from "./Icon";

afterEach(cleanup);

const names: IconName[] = ["close", "reply", "trash", "conversation", "more", "send"];

it.each(names)("draws the %s icon as a decorative svg", name => {
  const { container } = render(<Icon name={name} />);
  const svg = container.querySelector("svg");
  expect(svg?.getAttribute("aria-hidden")).toBe("true");
  expect(svg?.querySelector("path")?.getAttribute("d")).toBeTruthy();
});

it("has no accessibility violations on its own", async () => {
  const { container } = render(<Icon name="close" />);
  expect((await axe.run(container, { runOnly: ["svg-img-alt", "aria-hidden-focus"] })).violations).toEqual([]);
});
