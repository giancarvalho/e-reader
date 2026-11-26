// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, expect, it } from "vitest";
import { Notice } from "./Notice";

afterEach(cleanup);

it("announces its message politely by default", () => {
  render(<Notice>Salvo neste aparelho</Notice>);
  expect(screen.getByRole("status").textContent).toBe("Salvo neste aparelho");
});

it("can interrupt for failures", () => {
  render(<Notice live="alert">Não foi possível salvar</Notice>);
  expect(screen.getByRole("alert").textContent).toBe("Não foi possível salvar");
  expect(screen.queryByRole("status")).toBeNull();
});

it("keeps an empty live region in the document so later text is announced", () => {
  const { rerender } = render(<Notice />);
  const region = screen.getByRole("status");
  expect(region.childElementCount).toBe(0);
  rerender(<Notice>Enviando</Notice>);
  expect(screen.getByRole("status")).toBe(region);
  expect(region.textContent).toBe("Enviando");
});

it("marks announce-only messages so they are hidden visually", () => {
  render(<Notice announceOnly>Código inválido</Notice>);
  expect(screen.getByRole("status").hasAttribute("data-announce-only")).toBe(true);
});

it("has no accessibility violations", async () => {
  const { container } = render(<Notice>Mensagem</Notice>);
  expect((await axe.run(container, { runOnly: ["aria-allowed-role", "aria-valid-attr"] })).violations).toEqual([]);
});
