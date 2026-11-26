// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, expect, it } from "vitest";
import { ActionBar } from "./ActionBar";

afterEach(cleanup);

it("is a named group holding its actions", () => {
  render(<ActionBar label="Ações do trecho"><button>Definir</button><button>Cancelar</button></ActionBar>);
  const group = screen.getByRole("group", { name: "Ações do trecho" });
  expect(group.querySelectorAll("button")).toHaveLength(2);
});

it("has no accessibility violations", async () => {
  const { container } = render(<ActionBar label="Ações do trecho"><button>Definir</button></ActionBar>);
  expect((await axe.run(container, { runOnly: ["aria-allowed-role", "button-name"] })).violations).toEqual([]);
});
