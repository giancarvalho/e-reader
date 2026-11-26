// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, expect, it } from "vitest";
import { Link } from "./Link";

afterEach(cleanup);

it("renders a document navigation link by default", () => {
  render(<Link href="/estante">Estante</Link>);
  const link = screen.getByRole("link", { name: "Estante" });
  expect(link.getAttribute("href")).toBe("/estante");
  expect(link.dataset.variant).toBe("standalone");
  expect(link.dataset.tone).toBe("accent");
});

it("keeps link attributes such as target and rel", () => {
  render(<Link href="https://example.test" target="_blank" rel="noreferrer" variant="inline" tone="muted">Fonte</Link>);
  const link = screen.getByRole("link", { name: "Fonte" });
  expect(link.getAttribute("target")).toBe("_blank");
  expect(link.getAttribute("rel")).toBe("noreferrer");
  expect(link.dataset.variant).toBe("inline");
  expect(link.dataset.tone).toBe("muted");
});

it("supports client navigation without changing the markup contract", () => {
  render(<Link href="/conta" client>Conta</Link>);
  expect(screen.getByRole("link", { name: "Conta" }).getAttribute("href")).toBe("/conta");
});

it("has an accessible name and is keyboard focusable", async () => {
  const { container } = render(<Link href="/estante">Estante</Link>);
  expect((await axe.run(container, { runOnly: ["link-name"] })).violations).toEqual([]);
  expect(screen.getByRole("link").tabIndex).toBe(0);
});
