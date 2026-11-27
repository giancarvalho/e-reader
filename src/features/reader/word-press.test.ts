// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { applyTextSelection, bindWordPress } from "./word-press";
import { readerStyles } from "./reader-styles";

function chapter() {
  const doc = document.implementation.createHTMLDocument("c");
  doc.body.innerHTML = "<p>Alpha beta</p>";
  return doc;
}

describe("native touch selection", () => {
  it("marks the chapter selectable only while the app owns a selection", async () => {
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
    expect(doc.documentElement.hasAttribute("data-reader-selectable")).toBe(false);
    control.abort();
  });

  it("blocks browser selection on touch screens unless the app selected", () => {
    const css = readerStyles({ theme: "day", size: 18, font: "serif", ink: "#000000", background: "#ffffff" } as never);
    expect(css).toMatch(/pointer: coarse[\s\S]*html:not\(\[data-reader-selectable\]\)[\s\S]*user-select: none/);
  });
});
