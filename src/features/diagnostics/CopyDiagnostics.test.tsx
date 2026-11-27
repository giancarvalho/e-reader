// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { clearGestureLog, logGesture } from "@/lib/gesture-log";
import { messages } from "@/lib/messages/pt-br";
import { CopyDiagnostics } from "./CopyDiagnostics";

const { diagnostics } = messages;

// jsdom does not implement the modal dialog API that Sheet uses.
Object.defineProperties(HTMLDialogElement.prototype, {
  showModal: { configurable: true, value(this: HTMLDialogElement) { this.open = true; } },
  close: { configurable: true, value(this: HTMLDialogElement) { this.open = false; } },
});

afterEach(() => {
  cleanup();
  clearGestureLog();
  Reflect.deleteProperty(navigator, "clipboard");
});

it("copies the status, the device and the recorded touch events", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  logGesture("touchend", { outcome: "dead", ms: 600 });
  render(<CopyDiagnostics status={{ version: "abc123", worker: true }} />);

  fireEvent.click(screen.getByRole("button", { name: diagnostics.copy }));
  await waitFor(() => expect(writeText).toHaveBeenCalledOnce());
  const report = writeText.mock.calls[0]?.[0] as string;
  expect(report).toContain("version: abc123");
  expect(report).toContain("userAgent:");
  expect(report).toContain("touchend outcome=dead ms=600");
  expect(await screen.findByText(diagnostics.copied)).toBeTruthy();
});

it("offers the text for manual copying when the clipboard is refused", async () => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
  });
  render(<CopyDiagnostics status={{ version: "abc123" }} />);

  fireEvent.click(screen.getByRole("button", { name: diagnostics.copy }));
  const field = await screen.findByLabelText(diagnostics.copyField) as HTMLTextAreaElement;
  expect(field.value).toContain("version: abc123");
});
