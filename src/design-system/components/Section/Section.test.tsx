// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, expect, it } from "vitest";
import { Section } from "./Section";

afterEach(cleanup);

it("is a region named by its title", () => {
  render(<Section title="Neste aparelho"><p>Conteúdo</p></Section>);
  expect(screen.getByRole("region", { name: "Neste aparelho" })).toBeTruthy();
  expect(screen.getByRole("heading", { level: 2, name: "Neste aparelho" })).toBeTruthy();
});

it("works without a title and exposes its variant", () => {
  render(<Section variant="outlined"><p>Conteúdo</p></Section>);
  expect(screen.getByText("Conteúdo").parentElement?.dataset.variant).toBe("outlined");
  expect(screen.queryByRole("heading")).toBeNull();
});

it("has no accessibility violations", async () => {
  const { container } = render(<main><Section title="Ajuda"><p>Texto</p></Section></main>);
  expect((await axe.run(container, { runOnly: ["landmark-unique", "aria-valid-attr-value"] })).violations).toEqual([]);
});
