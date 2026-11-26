// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, expect, it } from "vitest";
import { Page } from "./Page";

afterEach(cleanup);

it("is the main landmark by default and exposes its variant", () => {
  render(<Page variant="intro"><h1>Título</h1></Page>);
  const main = screen.getByRole("main");
  expect(main.dataset.variant).toBe("intro");
  expect(screen.getByRole("heading", { name: "Título" })).toBeTruthy();
});

it("can render as another element without becoming a landmark", () => {
  render(<Page as="div" variant="banner"><p>Aviso</p></Page>);
  expect(screen.queryByRole("main")).toBeNull();
  expect(screen.getByText("Aviso").parentElement?.tagName).toBe("DIV");
});

it("renders a header element when asked", () => {
  const { container } = render(<Page as="header"><h1>Título</h1></Page>);
  expect(container.querySelector("header")).not.toBeNull();
});

it("has no accessibility violations for a main landmark with a heading", async () => {
  const { container } = render(<Page><h1>Título</h1><p>Texto</p></Page>);
  expect((await axe.run(container, { runOnly: ["landmark-one-main", "page-has-heading-one"] })).violations).toEqual([]);
});
