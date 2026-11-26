// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, expect, it } from "vitest";
import { Progress } from "./Progress";

afterEach(cleanup);

it("exposes the value, the maximum and an accessible name", () => {
  render(<Progress label="Progresso de leitura" value={0.4} />);
  const bar = screen.getByRole("progressbar", { name: "Progresso de leitura" });
  expect(bar.getAttribute("value")).toBe("0.4");
  expect(bar.getAttribute("max")).toBe("1");
});

it("shows the value text next to the bar when given", () => {
  render(<Progress label="Download" value={30} max={120} valueText="25%" />);
  expect(screen.getByText("25%")).toBeTruthy();
  expect(screen.getByRole("progressbar").getAttribute("max")).toBe("120");
});

it("renders no value text by default", () => {
  const { container } = render(<Progress label="Download" value={1} />);
  expect(container.querySelector("p")).toBeNull();
});

it("has an accessible name", async () => {
  const { container } = render(<Progress label="Download" value={0.5} valueText="50%" />);
  expect((await axe.run(container, { runOnly: ["aria-progressbar-name"] })).violations).toEqual([]);
});
