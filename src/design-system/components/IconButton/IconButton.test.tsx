// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, expect, it, vi } from "vitest";
import { IconButton } from "./IconButton";

afterEach(cleanup);

it("is named by its label and activates with click and keyboard", async () => {
  const onClick = vi.fn();
  render(<IconButton icon="close" label="Fechar" onClick={onClick} />);
  const button = screen.getByRole("button", { name: "Fechar" });
  await userEvent.click(button);
  await userEvent.tab();
  button.focus();
  await userEvent.keyboard("{Enter}");
  expect(onClick).toHaveBeenCalledTimes(2);
});

it("passes state attributes and submit type through to the button", () => {
  render(<form><IconButton icon="send" label="Enviar" type="submit" aria-expanded={true} /></form>);
  const button = screen.getByRole("button", { name: "Enviar" }) as HTMLButtonElement;
  expect(button.type).toBe("submit");
  expect(button.getAttribute("aria-expanded")).toBe("true");
  expect(button.dataset.variant).toBe("icon");
});

it("is disabled while loading", () => {
  render(<IconButton icon="send" label="Enviar" loading />);
  expect((screen.getByRole("button", { name: "Enviar" }) as HTMLButtonElement).disabled).toBe(true);
});

it("has an accessible name", async () => {
  const { container } = render(<IconButton icon="trash" label="Apagar" />);
  expect((await axe.run(container, { runOnly: ["button-name"] })).violations).toEqual([]);
});
