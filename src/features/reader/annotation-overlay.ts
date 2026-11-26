import type { Annotation } from "@/lib/sync/annotations";
import type { Overlayer as OverlayerType } from "@/vendor/foliate/overlayer";

export type DrawnAnnotation = { id: string; value: string; color: string; hasComments: boolean; quote: string };

/** Some browsers suppress events in a script-disabled EPUB iframe. */
export function chapterReceivesEvents(doc: Document) {
  let received = false;
  const type = "foliate-input-probe";
  const probe = () => { received = true; };
  doc.addEventListener(type, probe, { once: true });
  doc.documentElement.dispatchEvent(new Event(type, { bubbles: true }));
  doc.removeEventListener(type, probe);
  return received;
}

export function textRange(doc: Document, selection: Range) {
  const startIsText = selection.startContainer.nodeType === Node.TEXT_NODE;
  const endIsText = selection.endContainer.nodeType === Node.TEXT_NODE;
  if (startIsText && endIsText) return selection;

  // EPUB CFIs only encode character offsets for text nodes.
  const walker = doc.createTreeWalker(selection.commonAncestorContainer, NodeFilter.SHOW_TEXT);
  let first: Node | undefined;
  let last: Node | undefined;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent || !selection.intersectsNode(node)) continue;
    first ??= node;
    last = node;
  }
  const range = selection.cloneRange();
  if (!startIsText && first) range.setStart(first, 0);
  if (!endIsText && last) range.setEnd(last, last.textContent!.length);
  return range;
}

export function drawing(row: Annotation, hasComments: boolean): DrawnAnnotation {
  const token = row.color === "amber" ? "--color-amber" : `--highlight-${row.color}`;
  return {
    id: row.id, value: row.cfi, hasComments, quote: row.quote_text, color: getComputedStyle(document.documentElement).getPropertyValue(token).trim(),
  };
}

/** Where a highlight sits on screen, for placing a panel beside it. */
export function annotationAnchor(content: HTMLElement | null, range?: Range, options?: {
  point?: { x: number; y: number };
  wholeRange?: boolean;
}) {
  const frame = range?.startContainer.ownerDocument?.defaultView?.frameElement;
  const bounds = frame?.getBoundingClientRect();
  const area = content?.getBoundingClientRect();
  if (!range || !bounds || !area) return;
  const visible = Array.from(range.getClientRects()).map(rect => ({
    left: Math.max(area.left, bounds.left, bounds.left + rect.left),
    right: Math.min(area.right, bounds.right, bounds.left + rect.right),
    top: Math.max(area.top, bounds.top, bounds.top + rect.top),
    bottom: Math.min(area.bottom, bounds.bottom, bounds.top + rect.bottom),
  })).filter(rect => rect.right > rect.left && rect.bottom > rect.top);
  if (options?.wholeRange && visible.length) {
    const left = Math.min(...visible.map(rect => rect.left));
    const right = Math.max(...visible.map(rect => rect.right));
    return { x: (left + right) / 2, top: Math.min(...visible.map(rect => rect.top)),
      bottom: Math.max(...visible.map(rect => rect.bottom)) };
  }
  const point = options?.point;
  const line = point && visible.find(rect => {
    const x = bounds.left + point.x;
    const y = bounds.top + point.y;
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }) || visible[0];
  if (line) return { x: (line.left + line.right) / 2, top: line.top, bottom: line.bottom };
}

export type DrawDetail = {
  annotation: DrawnAnnotation;
  doc: Document;
  range: Range;
  draw: (method: typeof OverlayerType.highlight, options: { color: string; opacity: number }) => void;
};

/** Paints one highlight, with a comment marker when it has replies and a tap target when the page cannot receive events itself. */
export function drawAnnotation(
  { annotation, doc, draw, range }: DrawDetail,
  Overlayer: typeof OverlayerType,
  overlaysReceiveTaps: WeakSet<Document>,
  open: (id: string, range?: Range, point?: { x: number; y: number }) => void,
) {
  // Older CFIs lost offsets when both boundaries were on the same element.
  if (range.collapsed && range.startContainer.nodeType === Node.ELEMENT_NODE &&
    range.startContainer.textContent?.trim() === annotation.quote) {
    range.selectNodeContents(range.startContainer);
  }
  draw((rects, options) => {
    const group = Overlayer.highlight(rects, options);
    let overlay = group;
    const lastRect = annotation.hasComments
      ? Array.from(rects).reverse().find(fragment => fragment.width > 0 && fragment.height > 0)
      : undefined;
    if (lastRect) {
      const mark = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const x = Math.max(lastRect.left, lastRect.right - 10);
      const y = Math.max(lastRect.top, lastRect.bottom - 9);
      mark.setAttribute("data-comment-marker", "");
      mark.setAttribute("d", `M${x} ${y} h9 v6 h-4 l-3 3 v-3 h-2 Z`);
      mark.setAttribute("fill", "var(--color-bg)");
      mark.setAttribute("stroke", "var(--color-ink)");
      mark.setAttribute("stroke-width", "1");
      overlay = document.createElementNS("http://www.w3.org/2000/svg", "g");
      overlay.append(group, mark);
    }
    if (overlaysReceiveTaps.has(doc)) {
      overlay.style.pointerEvents = "all";
      overlay.style.cursor = "pointer";
      overlay.addEventListener("click", event => {
        const frame = doc.defaultView?.frameElement?.getBoundingClientRect();
        const point = frame && { x: event.clientX - frame.left, y: event.clientY - frame.top };
        open(annotation.id, range, point);
      });
    }
    return overlay;
  }, { color: annotation.color, opacity: 0.38 });
}
