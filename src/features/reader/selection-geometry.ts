import { wordPattern } from "./word-press";

export type SelectionEdge = "start" | "end";

export function rangeDocument(range: Range) {
  return range.startContainer.ownerDocument!;
}

export function edgePoint(range: Range, edge: SelectionEdge, area?: DOMRect) {
  const doc = rangeDocument(range);
  const frame = doc.defaultView?.frameElement?.getBoundingClientRect();
  if (!frame || !area) return;
  const caret = range.cloneRange();
  caret.collapse(edge === "start");
  const glyph = range.getClientRects();
  const rect = Array.from(caret.getClientRects()).find(box => box.height > 0) ??
    glyph[edge === "start" ? 0 : glyph.length - 1];
  if (!rect) return;

  const rtl = doc.defaultView?.getComputedStyle(caret.startContainer.parentElement!).direction === "rtl";
  const x = frame.left + ((edge === "start") !== rtl ? rect.left : rect.right);
  const y = frame.top + rect.bottom;
  if (x < area.left || x > area.right || y < area.top || y > area.bottom) return;
  return { x, y, height: rect.height, outward: (edge === "start") !== rtl ? "left" : "right" };
}

export function withMovedEdge(range: Range, edge: SelectionEdge, word: Range) {
  const next = range.cloneRange();
  if (edge === "start") next.setStart(word.startContainer, word.startOffset);
  else next.setEnd(word.endContainer, word.endOffset);
  if (!next.collapsed && next.compareBoundaryPoints(Range.START_TO_START, range) === 0 &&
    next.compareBoundaryPoints(Range.END_TO_END, range) === 0) return;
  return next.collapsed ? undefined : next;
}

export function nextWord(range: Range, edge: SelectionEdge, forward: boolean) {
  const doc = rangeDocument(range);
  const caret = range.cloneRange();
  caret.collapse(edge === "start");
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  walker.currentNode = caret.startContainer;
  let offset = caret.startOffset;

  for (let node: Node | null = walker.currentNode; node; node = forward ? walker.nextNode() : walker.previousNode()) {
    if (node.nodeType !== Node.TEXT_NODE) continue;
    const words = Array.from((node.textContent ?? "").matchAll(wordPattern));
    if (!forward) words.reverse();
    for (const word of words) {
      const end = word.index + word[0].length;
      const position = edge === "start" ? word.index : end;
      if (forward ? position <= offset : position >= offset) continue;
      const candidate = doc.createRange();
      candidate.setStart(node, word.index);
      candidate.setEnd(node, end);
      if (candidate.getClientRects().length) return candidate;
    }
    offset = forward ? -1 : Infinity;
  }
}
