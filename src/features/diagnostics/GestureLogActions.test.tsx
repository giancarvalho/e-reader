// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { clearGestureLog, logGesture } from "@/lib/gesture-log";
import { messages } from "@/lib/messages/pt-br";
import { GestureLogActions } from "./GestureLogActions";

const { gestures } = messages.diagnostics;

afterEach(() => {
  cleanup();
  clearGestureLog();
  Reflect.deleteProperty(navigator, "clipboard");
});

it("disables the actions while there is nothing to copy", async () => {
  render(<GestureLogActions />);
  expect(await screen.findByText(gestures.none)).toBeTruthy();
  expect((screen.getByRole("button", { name: gestures.copy }) as HTMLButtonElement).disabled).toBe(true);
});

it("copies a report with the environment and the recorded events", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  logGesture("touchend", { outcome: "dead", ms: 600 });
  render(<GestureLogActions />);
  await screen.findByText(`1 ${gestures.events}`);

  fireEvent.click(screen.getByRole("button", { name: gestures.copy }));
  await waitFor(() => expect(writeText).toHaveBeenCalledOnce());
  const report = writeText.mock.calls[0]?.[0] as string;
  expect(report).toContain("E-reader gesture log");
  expect(report).toContain("userAgent:");
  expect(report).toContain("touchend outcome=dead ms=600");
  expect(await screen.findByText(gestures.copied)).toBeTruthy();
});

it("offers the text for manual copying when the clipboard is refused", async () => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
  });
  logGesture("touchstart", { x: 1 });
  render(<GestureLogActions />);
  await screen.findByText(`1 ${gestures.events}`);

  fireEvent.click(screen.getByRole("button", { name: gestures.copy }));
  const field = await screen.findByLabelText(gestures.field) as HTMLTextAreaElement;
  expect(field.value).toContain("touchstart x=1");
});

it("clears the recorded events", async () => {
  logGesture("touchstart");
  render(<GestureLogActions />);
  await screen.findByText(`1 ${gestures.events}`);
  fireEvent.click(screen.getByRole("button", { name: gestures.clear }));
  expect(await screen.findByText(gestures.cleared)).toBeTruthy();
  expect(screen.getByText(gestures.none)).toBeTruthy();
});
