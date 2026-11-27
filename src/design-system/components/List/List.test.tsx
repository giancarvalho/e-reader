// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, expect, it } from "vitest";
import { List, ListItem } from "./List";

afterEach(cleanup);

it("keeps list semantics with the markers removed", () => {
  render(<List><ListItem>Um</ListItem><ListItem divided>Dois</ListItem></List>);
  expect(screen.getByRole("list")).toBeTruthy();
  expect(screen.getAllByRole("listitem")).toHaveLength(2);
  expect(screen.getByText("Dois").dataset.divided).toBeDefined();
  expect(screen.getByText("Um").dataset.divided).toBeUndefined();
});

it("can be an ordered list", () => {
  const { container } = render(<List as="ol"><ListItem>Definição</ListItem></List>);
  expect(container.querySelector("ol")).not.toBeNull();
});

it("has no accessibility violations", async () => {
  const { container } = render(<List><ListItem divided>Um</ListItem><ListItem divided>Dois</ListItem></List>);
  expect((await axe.run(container, { runOnly: ["list", "listitem"] })).violations).toEqual([]);
});
