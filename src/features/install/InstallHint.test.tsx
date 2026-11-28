// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { InstallKind } from "@/lib/install";
import { messages } from "@/lib/messages/pt-br";
import { InstallHint } from "./InstallHint";

const state = vi.hoisted(() => ({
  value: { kind: "ios", canPrompt: false, seen: false, install: vi.fn(), markSeen: vi.fn() },
}));
vi.mock("@/lib/install", () => ({ useInstall: () => state.value }));

// jsdom does not implement the modal dialog API that Sheet uses.
Object.defineProperties(HTMLDialogElement.prototype, {
  showModal: { configurable: true, value(this: HTMLDialogElement) { this.open = true; } },
  close: { configurable: true, value(this: HTMLDialogElement) { this.open = false; } },
});

function setup(overrides: Partial<{ kind: InstallKind; canPrompt: boolean; seen: boolean }>) {
  state.value = { kind: "ios", canPrompt: false, seen: false, install: vi.fn().mockResolvedValue(true), markSeen: vi.fn(), ...overrides };
}

beforeEach(() => setup({}));
afterEach(cleanup);

it("opens a sheet with the steps the first time", () => {
  render(<InstallHint />);
  expect(screen.getByRole("dialog", { name: messages.install.title })).toBeTruthy();
  expect(screen.getByText(`1. ${messages.install.iosSteps[0]}`)).toBeTruthy();
});

it("is remembered as seen when dismissed", () => {
  render(<InstallHint />);
  fireEvent.click(screen.getByRole("button", { name: messages.install.notNow }));
  expect(state.value.markSeen).toHaveBeenCalledOnce();
});

it("installs through the browser prompt on Android and then stops showing", async () => {
  setup({ kind: "android", canPrompt: true });
  render(<InstallHint />);
  fireEvent.click(screen.getByRole("button", { name: messages.install.install }));
  await vi.waitFor(() => expect(state.value.markSeen).toHaveBeenCalledOnce());
  expect(state.value.install).toHaveBeenCalledOnce();
});

it.each([
  ["already seen", { seen: true }],
  ["installed", { kind: "installed" as const }],
  ["desktop", { kind: "none" as const }],
])("shows nothing when %s", (_, overrides) => {
  setup(overrides);
  const { container } = render(<InstallHint />);
  expect(container.querySelector("dialog")).toBeNull();
});
