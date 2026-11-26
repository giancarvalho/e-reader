// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { Heading } from "./Heading";

afterEach(cleanup);

it("renders the heading at the level requested by the caller", () => {
  render(<Heading as="h2">Capítulo</Heading>);
  expect(screen.getByRole("heading", { level: 2, name: "Capítulo" })).toBeTruthy();
});

it("exposes the typographic variant without changing the level", () => {
  render(<Heading as="h2" variant="section">Grupo</Heading>);
  const heading = screen.getByRole("heading", { level: 2, name: "Grupo" });
  expect(heading.dataset.variant).toBe("section");
});

it("defaults to the page variant", () => {
  render(<Heading>Título</Heading>);
  expect(screen.getByRole("heading", { name: "Título" }).dataset.variant).toBe("page");
});
