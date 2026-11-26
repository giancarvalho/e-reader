// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, expect, it } from "vitest";
import { LinkButton } from "./LinkButton";

afterEach(cleanup);

it("is a link with the primary button variant by default", () => {
  render(<LinkButton href="/entrar">Entrar</LinkButton>);
  const link = screen.getByRole("link", { name: "Entrar" });
  expect(link.getAttribute("href")).toBe("/entrar");
  expect(link.dataset.variant).toBe("primary");
});

it("exposes the requested variant", () => {
  render(<LinkButton href="/estante" variant="secondary">Estante</LinkButton>);
  expect(screen.getByRole("link").dataset.variant).toBe("secondary");
});

it("has an accessible name", async () => {
  const { container } = render(<LinkButton href="/entrar">Entrar</LinkButton>);
  expect((await axe.run(container, { runOnly: ["link-name"] })).violations).toEqual([]);
});
