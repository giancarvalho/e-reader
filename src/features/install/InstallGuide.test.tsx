// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { messages } from "@/lib/messages/pt-br";
import { InstallGuide } from "./InstallGuide";

const { install } = messages;

afterEach(cleanup);

it("explains Share > Add to Home Screen on iPhone, with numbered steps", () => {
  render(<InstallGuide kind="ios" canPrompt={false} onInstall={() => undefined} />);
  expect(screen.getByText(install.intro)).toBeTruthy();
  expect(screen.getAllByRole("listitem").map(item => item.textContent)).toEqual(
    install.iosSteps.map((step, index) => `${index + 1}. ${step}`),
  );
  expect(screen.queryByRole("button")).toBeNull();
});

it("offers the native prompt on Android when the browser provides it", () => {
  const onInstall = vi.fn();
  render(<InstallGuide kind="android" canPrompt onInstall={onInstall} />);
  fireEvent.click(screen.getByRole("button", { name: install.install }));
  expect(onInstall).toHaveBeenCalledOnce();
  expect(screen.queryByRole("listitem")).toBeNull();
});

it("falls back to the browser menu steps on Android without the prompt", () => {
  render(<InstallGuide kind="android" canPrompt={false} onInstall={() => undefined} />);
  expect(screen.getAllByRole("listitem")).toHaveLength(install.androidSteps.length);
  expect(screen.queryByRole("button")).toBeNull();
});

it.each([
  ["embedded", install.embedded],
  ["installed", install.installed],
  ["none", install.unavailable],
] as const)("shows a single message for %s", (kind, text) => {
  render(<InstallGuide kind={kind} canPrompt={false} onInstall={() => undefined} />);
  expect(screen.getByText(text)).toBeTruthy();
  expect(screen.queryByRole("button")).toBeNull();
});
