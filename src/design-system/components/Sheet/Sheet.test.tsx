// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Sheet } from "./Sheet";

Object.defineProperties(HTMLDialogElement.prototype, {
  showModal: { configurable: true, value(this: HTMLDialogElement) { this.open = true; } },
  close: { configurable: true, value(this: HTMLDialogElement) { this.open = false; } },
});

afterEach(cleanup);

it("names the modal and delegates its native cancel event", () => {
  const close = vi.fn();
  const { container } = render(<Sheet title="Índice" onClose={close}><button>Fechar</button></Sheet>);
  const modal = container.querySelector("dialog");
  expect(modal?.getAttribute("open")).not.toBeNull();
  expect(screen.getByRole("dialog", { name: "Índice" })).toBeTruthy();
  if (!modal) throw new Error("Missing dialog");
  fireEvent(modal, new Event("cancel", { cancelable: true }));
  expect(close).toHaveBeenCalledOnce();
});
