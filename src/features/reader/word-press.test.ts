// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { holdMs } from "./page-gestures";
import { applyTextSelection, bindWordPress, pressSlopPx } from "./word-press";
import { readerStyles } from "./reader-styles";

function chapter() {
  const doc = document.implementation.createHTMLDocument("c");
  doc.body.innerHTML = "<p>Alpha beta</p>";
  return doc;
}

describe("native touch selection", () => {
  it("marks the chapter selectable only while the app owns a selection", () => {
    vi.useFakeTimers();
    const doc = chapter();
    const control = new AbortController();
    bindWordPress(doc, control.signal, () => {});
    const text = doc.querySelector("p")!.firstChild!;
    const range = doc.createRange();
    range.setStart(text, 0);
    range.setEnd(text, 5);

    applyTextSelection(doc, range);
    expect(doc.documentElement.hasAttribute("data-reader-selectable")).toBe(true);

    doc.getSelection()?.removeAllRanges();
    doc.dispatchEvent(new Event("selectionchange"));
    expect(doc.documentElement.hasAttribute("data-reader-selectable")).toBe(true);
    vi.advanceTimersByTime(200);
    expect(doc.documentElement.hasAttribute("data-reader-selectable")).toBe(false);
    control.abort();
    vi.useRealTimers();
  });

  it("blocks browser selection on touch screens unless the app selected", () => {
    const css = readerStyles({ theme: "day", size: 18, font: "serif", ink: "#000000", background: "#ffffff" } as never);
    expect(css).toMatch(/pointer: coarse[\s\S]*html:not\(\[data-reader-selectable\]\)[\s\S]*user-select: none/);
  });
});

describe("long press on a touch screen", () => {
  type Box = { left: number; right: number; top: number; bottom: number };
  const word: Box = { left: 10, right: 50, top: 10, bottom: 30 };

  function touch(doc: Document, type: string, x: number, y: number) {
    const point = { identifier: 1, clientX: x, clientY: y };
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperties(event, {
      touches: { value: type === "touchend" ? [] : [point] }, changedTouches: { value: [point] },
    });
    doc.dispatchEvent(event);
  }

  function setup() {
    vi.useFakeTimers();
    // The page's own document: a detached one has no window, hence no Selection.
    const doc = document;
    doc.body.innerHTML = "<p>Alpha beta</p>";
    const text = doc.querySelector("p")!.firstChild!;
    // jsdom has no layout: the caret always lands inside "Alpha" and its box is `word`.
    doc.caretRangeFromPoint = () => {
      const caret = doc.createRange();
      caret.setStart(text, 2);
      return caret;
    };
    Object.defineProperty(Range.prototype, "getClientRects", { configurable: true, value: () => [word] });
    const control = new AbortController();
    bindWordPress(doc, control.signal, () => {});
    return { doc, control };
  }

  function teardown(control: AbortController) {
    control.abort();
    document.getSelection()?.removeAllRanges();
    delete (Range.prototype as { getClientRects?: unknown }).getClientRects;
    vi.useRealTimers();
  }

  it("selects the word after the hold time", () => {
    const { doc, control } = setup();
    touch(doc, "touchstart", 30, 20);
    vi.advanceTimersByTime(holdMs - 1);
    expect(doc.getSelection()?.toString()).toBe("");
    vi.advanceTimersByTime(1);
    expect(doc.getSelection()?.toString()).toBe("Alpha");
    teardown(control);
  });

  it("selects the nearest word when the finger lands just beside it", () => {
    const { doc, control } = setup();
    touch(doc, "touchstart", 50 + pressSlopPx - 1, 20);
    vi.advanceTimersByTime(holdMs);
    expect(doc.getSelection()?.toString()).toBe("Alpha");
    teardown(control);
  });

  it("ignores a press farther than the slop from any word", () => {
    const { doc, control } = setup();
    touch(doc, "touchstart", 50 + pressSlopPx + 5, 20);
    vi.advanceTimersByTime(holdMs * 2);
    expect(doc.getSelection()?.toString()).toBe("");
    teardown(control);
  });

  it("cancels the mouse events iOS sends after a hold, so the selection survives", () => {
    const { doc, control } = setup();
    touch(doc, "touchstart", 30, 20);
    vi.advanceTimersByTime(holdMs);
    touch(doc, "touchend", 30, 20);
    for (const type of ["mousedown", "mouseup"]) {
      const event = new MouseEvent(type, { bubbles: true, cancelable: true });
      doc.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    }
    teardown(control);
  });

  it("leaves the mouse events of an ordinary tap alone", () => {
    const { doc, control } = setup();
    touch(doc, "touchstart", 30, 20);
    vi.advanceTimersByTime(80);
    touch(doc, "touchend", 30, 20);
    const event = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
    doc.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    teardown(control);
  });
});
