import { classifyPress, holdMs, movementTolerance, type PressOutcome } from "./page-gestures";

const interactive = "a, button, input, select, textarea, [contenteditable]";
export const wordPattern = /[\p{L}\p{M}]+(?:[-‐‑'’][\p{L}\p{M}]+)*/gu;

export function pressInProgress(doc: Document) {
  return doc.documentElement.matches("[data-reader-word-press], [data-reader-range-adjusting]");
}

export function wordAtPoint(doc: Document, x: number, y: number, snap = false) {
  const caret = doc.caretPositionFromPoint?.(x, y);
  const legacy = caret ? null : doc.caretRangeFromPoint?.(x, y);
  const node = caret?.offsetNode ?? legacy?.startContainer;
  const offset = caret?.offset ?? legacy?.startOffset;
  if (!node || node.nodeType !== Node.TEXT_NODE || offset === undefined) return;

  let nearest: Range | undefined;
  let distance = Infinity;
  for (const match of (node.textContent ?? "").matchAll(wordPattern)) {
    const start = match.index;
    const end = start + match[0].length;
    const gap = Math.max(start - offset, offset - end, 0);
    if (snap ? gap >= distance : gap > 0) continue;

    const word = doc.createRange();
    word.setStart(node, start);
    word.setEnd(node, end);

    if (snap) {
      nearest = word;
      distance = gap;
    } else if (Array.from(word.getClientRects()).some(rect =>
      x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom,
    )) return word;
  }
  return nearest;
}

export function applyTextSelection(doc: Document, range: Range) {
  const selection = doc.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

export type PressRecord = { outcome: PressOutcome; endedAt: number; x: number; y: number };
const lastPress = new WeakMap<Document, PressRecord>();

/** The touch that just ended, if any. A following `click` belongs to it and must obey its outcome. */
export function recentPress(doc: Document, windowMs = 800) {
  const record = lastPress.get(doc);
  return record && performance.now() - record.endedAt <= windowMs ? record : undefined;
}

type Press = {
  id: number;
  x: number;
  y: number;
  startedAt: number;
  travel: number;
  word?: Range;
  selecting: boolean;
  timer?: number;
};

export function bindWordPress(
  doc: Document,
  signal: AbortSignal,
  onRelease: () => void,
  onPress?: (press: PressRecord, target: Element | null) => void,
) {
  let press: Press | undefined;
  const root = doc.documentElement;

  function reset() {
    window.clearTimeout(press?.timer);
    root.removeAttribute("data-reader-word-press");
    press = undefined;
  }

  const options = { capture: true, passive: false, signal };

  doc.addEventListener("touchstart", event => {
    if (event.touches.length !== 1 || (event.target as Element | null)?.closest?.(interactive)) {
      if (press?.selecting) doc.getSelection()?.removeAllRanges();
      reset();
      return;
    }

    reset();
    const touch = event.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;
    const word = wordAtPoint(doc, x, y);
    const current: Press = {
      id: touch.identifier, x, y, word, selecting: false, startedAt: performance.now(), travel: 0,
    };
    press = current;
    root.dataset.readerWordPress = "pending";

    if (word) current.timer = window.setTimeout(() => {
      if (press !== current || doc.visibilityState !== "visible") return;
      current.selecting = true;
      root.dataset.readerWordPress = "selecting";
      applyTextSelection(doc, word);
    }, holdMs);
  }, options);

  doc.addEventListener("touchmove", event => {
    const current = press;
    if (!current) return;
    const touch = Array.from(event.touches).find(item => item.identifier === current.id);
    if (!touch) return;

    current.travel = Math.max(current.travel, Math.hypot(touch.clientX - current.x, touch.clientY - current.y));
    if (!current.selecting || !current.word) {
      if (current.travel > movementTolerance) window.clearTimeout(current.timer);
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    const next = wordAtPoint(doc, touch.clientX, touch.clientY);
    if (!next) return;

    const anchor = current.word;
    const first = next.compareBoundaryPoints(Range.START_TO_START, anchor) < 0 ? next : anchor;
    const last = first === anchor ? next : anchor;
    const range = first.cloneRange();
    range.setEnd(last.endContainer, last.endOffset);
    applyTextSelection(doc, range);
  }, options);

  doc.addEventListener("touchend", event => {
    const current = press;
    if (!current || !Array.from(event.changedTouches).some(touch => touch.identifier === current.id)) return;
    reset();
    const outcome = current.selecting ? "hold" : classifyPress(performance.now() - current.startedAt, current.travel);
    const record = { outcome, endedAt: performance.now(), x: current.x, y: current.y };
    lastPress.set(doc, record);
    onPress?.(record, event.target as Element | null);
    if (current.selecting) {
      event.preventDefault();
      event.stopImmediatePropagation();
      onRelease();
    }
  }, options);

  doc.addEventListener("touchcancel", () => {
    if (press?.selecting) doc.getSelection()?.removeAllRanges();
    reset();
  }, options);

  doc.addEventListener("contextmenu", event => {
    if (press) event.preventDefault();
  }, options);

  signal.addEventListener("abort", reset, { once: true });
}
