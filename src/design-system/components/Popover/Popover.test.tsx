// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, beforeAll, expect, it, vi } from "vitest";
import { Popover } from "./Popover";

beforeAll(() => {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
});

afterEach(cleanup);

it("is a named dialog that takes focus when it opens", () => {
  render(<Popover label="Comentários" onClose={() => undefined}><button>Responder</button></Popover>);
  const panel = screen.getByRole("dialog", { name: "Comentários" });
  expect(document.activeElement).toBe(panel);
});

it("gives focus back to where it came from when it closes", () => {
  const opener = document.createElement("button");
  document.body.append(opener);
  opener.focus();
  const { unmount } = render(<Popover label="Comentários" onClose={() => undefined}><p>Texto</p></Popover>);
  expect(document.activeElement).not.toBe(opener);
  unmount();
  expect(document.activeElement).toBe(opener);
  opener.remove();
});

it("keeps focus in place while opening and clicking a selection action", async () => {
  const action = vi.fn();
  render(<button>Leitor</button>);
  const reader = screen.getByRole("button", { name: "Leitor" });
  reader.focus();
  render(<Popover variant="toolbar" label="Ações do trecho" onClose={() => undefined}>
    <button onClick={action}>Definir</button>
  </Popover>);
  const group = screen.getByRole("group", { name: "Ações do trecho" });
  expect(document.activeElement).toBe(reader);
  await userEvent.click(group.querySelector("button")!);
  expect(action).toHaveBeenCalledOnce();
  expect(document.activeElement).toBe(reader);
});

it("closes on Escape", async () => {
  const onClose = vi.fn();
  render(<Popover label="Comentários" onClose={onClose}><p>Texto</p></Popover>);
  await userEvent.keyboard("{Escape}");
  expect(onClose).toHaveBeenCalledOnce();
});

it("closes on a press outside but not inside", async () => {
  const onClose = vi.fn();
  render(<><button>Fora</button><Popover label="Comentários" onClose={onClose}><button>Dentro</button></Popover></>);
  await userEvent.click(screen.getByRole("button", { name: "Dentro" }));
  expect(onClose).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "Fora" }));
  expect(onClose).toHaveBeenCalledOnce();
});

it("calls the latest onClose without resubscribing", async () => {
  const first = vi.fn();
  const second = vi.fn();
  const { rerender } = render(<Popover label="Comentários" onClose={first}><p>Texto</p></Popover>);
  rerender(<Popover label="Comentários" onClose={second}><p>Texto</p></Popover>);
  await userEvent.keyboard("{Escape}");
  expect(first).not.toHaveBeenCalled();
  expect(second).toHaveBeenCalledOnce();
});

it("places itself inside the visible area next to its anchor", () => {
  render(<Popover label="Comentários" onClose={() => undefined} anchor={() => ({ x: 100, top: 50, bottom: 70 })}><p>Texto</p></Popover>);
  const panel = screen.getByRole("dialog");
  expect(panel.style.left).toMatch(/px$/);
  expect(panel.style.top).toMatch(/px$/);
});

it("has no accessibility violations", async () => {
  const { container } = render(<Popover label="Comentários" onClose={() => undefined}><button>Responder</button></Popover>);
  expect((await axe.run(container, { runOnly: ["aria-dialog-name", "button-name"] })).violations).toEqual([]);
});
