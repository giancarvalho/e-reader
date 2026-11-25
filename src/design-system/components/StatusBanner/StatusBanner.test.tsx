// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { StatusBanner } from "./StatusBanner";

afterEach(cleanup);

it("announces status text and keeps the action independently accessible", () => {
  render(<StatusBanner tone="warning" action={<button>Atualizar</button>}>Nova versão</StatusBanner>);
  expect(screen.getByRole("status").textContent).toBe("Nova versão");
  expect(screen.getByRole("button", { name: "Atualizar" })).toBeTruthy();
});
