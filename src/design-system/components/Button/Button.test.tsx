// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, expect, it, vi } from "vitest";
import { Button } from "./Button";

afterEach(cleanup);

it("supports keyboard activation without submitting a form by default", async () => {
  const onClick = vi.fn();
  const onSubmit = vi.fn();
  render(<form onSubmit={onSubmit}><Button onClick={onClick}>Abrir</Button></form>);
  const user = userEvent.setup();
  await user.tab();
  await user.keyboard("{Enter}");
  expect(onClick).toHaveBeenCalledOnce();
  expect(onSubmit).not.toHaveBeenCalled();
});

it("exposes loading state and prevents activation", async () => {
  const onClick = vi.fn();
  render(<Button variant="secondary" loading onClick={onClick}>Carregando</Button>);
  const button = screen.getByRole("button", { name: "Carregando" }) as HTMLButtonElement;
  expect(button.disabled).toBe(true);
  expect(button.getAttribute("aria-busy")).toBe("true");
  expect(button.dataset.variant).toBe("secondary");
  await userEvent.click(button);
  expect(onClick).not.toHaveBeenCalled();
});

it("provides an accessible name for an icon button", async () => {
  const { container } = render(
    <Button variant="icon" aria-label="Adicionar"><span aria-hidden="true">+</span></Button>,
  );
  expect(screen.getByRole("button", { name: "Adicionar" })).toBeTruthy();
  expect((await axe.run(container, { runOnly: ["button-name"] })).violations).toEqual([]);
});
