import type { AnnotationSelection } from "@/features/annotations";
import type { View } from "@/vendor/foliate/view";
import { annotationAnchor, textRange } from "./annotation-overlay";
import { pressInProgress } from "./word-press";

export type ReaderSelection = AnnotationSelection & {
  range: Range;
  anchor: () => ReturnType<typeof annotationAnchor>;
  frameArea: () => DOMRect | undefined;
  commit: (range: Range) => boolean;
};

function selectedQuote(doc: Document) {
  return doc.getSelection()?.toString().trim().slice(0, 4000);
}

export function trackReaderSelection(
  readView: () => View | undefined,
  content: HTMLElement | null,
  canInspect: () => boolean,
  report: (selection?: ReaderSelection) => void,
) {
  let previous = "";
  let shown = false;
  let timer: number | undefined;

  function pause() {
    previous = "";
    window.clearTimeout(timer);
  }

  function clear(removeRanges = false) {
    pause();
    if (shown) report();
    shown = false;
    if (removeRanges) {
      for (const { doc } of readView()?.renderer?.getContents() ?? []) doc.getSelection()?.removeAllRanges();
    }
  }

  function frameArea() {
    return content?.getBoundingClientRect();
  }

  function publish(view: View, doc: Document, index: number, range: Range, cfi: string, quote: string) {
    shown = true;
    report({
      cfi, quote, range,
      sample: doc.body?.textContent?.slice(0, 5000),
      anchor: () => annotationAnchor(content, range, { wholeRange: true }),
      frameArea,
      commit(next) {
        const text = selectedQuote(doc);
        if (!text || !canInspect() || !view.renderer.getContents().some(item => item.doc === doc)) return false;
        try {
          const nextCfi = view.getCFI(index, next);
          if (nextCfi.length > 4096) return false;
          if (nextCfi !== previous) {
            pause();
            previous = nextCfi;
            publish(view, doc, index, next, nextCfi, text);
          }
          return true;
        } catch {
          return false;
        }
      },
    });
  }

  function inspect() {
    const view = readView();
    if (!view?.renderer || !canInspect() || document.visibilityState !== "visible") return;
    for (const { doc, index } of view.renderer.getContents()) {
      if (pressInProgress(doc)) return;
      const selected = doc.getSelection();
      const quote = selectedQuote(doc);
      if (!quote || !selected?.rangeCount) continue;
      try {
        const range = textRange(doc, selected.getRangeAt(0)).cloneRange();
        const cfi = view.getCFI(index, range);
        if (cfi.length <= 4096 && cfi !== previous) {
          pause();
          previous = cfi;
          timer = window.setTimeout(() => {
            if (canInspect() && !pressInProgress(doc) && selectedQuote(doc) === quote) {
              publish(view, doc, index, range, cfi, quote);
            }
          }, 180);
        }
      } catch {
        // A selection can disappear while the paginator changes chapters.
      }
      return;
    }
    clear();
  }

  return { inspect, clear, pause, get shown() { return shown; } };
}
