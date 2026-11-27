// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, expect, it } from "vitest";
import { Disclosure } from "./Disclosure";

afterEach(cleanup);

it("starts closed by default and opens from the summary", async () => {
  const { container } = render(<Disclosure summary="Capítulo 1 (2)"><p>Grifos</p></Disclosure>);
  const details = container.querySelector("details")!;
  expect(details.open).toBe(false);
  await userEvent.click(screen.getByText("Capítulo 1 (2)"));
  expect(details.open).toBe(true);
});

it("can start open", () => {
  const { container } = render(<Disclosure summary="Capítulo" open><p>Grifos</p></Disclosure>);
  expect(container.querySelector("details")!.open).toBe(true);
});

it("has no accessibility violations", async () => {
  const { container } = render(<Disclosure summary="Capítulo"><p>Grifos</p></Disclosure>);
  expect((await axe.run(container, { runOnly: ["summary-name"] })).violations).toEqual([]);
});
