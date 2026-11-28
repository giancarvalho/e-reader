import { logGesture } from "@/lib/gesture-log";
import { classifyPress, holdMs, movementTolerance, type PressOutcome } from "./page-gestures";

/** How long a selection must stay empty before the chapter blocks native selection again. */
const selectableReleaseMs = 150;
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

/** How far (px) from the finger the nearest word may be and still count as pressed: half a 44 px touch target. */
export const pressSlopPx = 22;

/**
 * The word under the finger or, when the finger lands between words or lines, the nearest one within `pressSlopPx`.
 * A strict hit test misses roughly half of the paragraph area (word gaps, line spacing).
 */
export function wordNearPoint(doc: Document, x: number, y: number) {
  const exact = wordAtPoint(doc, x, y);
  if (exact) return exact;
  const near = wordAtPoint(doc, x, y, true);
  if (!near) return;
  const distance = Math.min(...Array.from(near.getClientRects(), rect =>
    Math.hypot(Math.max(rect.left - x, x - rect.right, 0), Math.max(rect.top - y, y - rect.bottom, 0))));
  return distance <= pressSlopPx ? near : undefined;
}

/**
 * Touch screens only allow text selection while the app owns one (see `readerStyles`).
 * Otherwise the browser's own long press selects a word well before the 1 s hold.
 */
export function applyTextSelection(doc: Document, range: Range) {
  doc.documentElement.dataset.readerSelectable = "";
  // WebKit validates a new range against the style in force. Without this, it still sees `user-select: none`.
  void doc.defaultView?.getComputedStyle(doc.documentElement).userSelect;
  const selection = doc.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

/** Checks after a hold ends, to see on a real device whether the system kept the selection. */
const selectionSampleMs = [0, 300, 1_200];

function logSelection(doc: Document, when: string) {
  const selection = doc.getSelection();
  logGesture("selection-state", {
    when, collapsed: selection?.isCollapsed ?? true, length: selection?.toString().length ?? 0,
    selectable: doc.documentElement.hasAttribute("data-reader-selectable"),
  });
}

function tagOf(target: EventTarget | null) {
  return (target as Element | null)?.tagName?.toLowerCase();
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
  moveLogged?: boolean;
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
      logGesture("touchstart-ignored", {
        touches: event.touches.length, interactive: Boolean((event.target as Element | null)?.closest?.(interactive)),
      });
      if (press?.selecting) doc.getSelection()?.removeAllRanges();
      reset();
      return;
    }

    reset();
    const touch = event.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;
    const word = wordNearPoint(doc, x, y);
    const current: Press = {
      id: touch.identifier, x, y, word, selecting: false, startedAt: performance.now(), travel: 0,
    };
    press = current;
    root.dataset.readerWordPress = "pending";
    logGesture("touchstart", {
      x: Math.round(x), y: Math.round(y), target: tagOf(event.target), word: Boolean(word), cancelable: event.cancelable,
    });

    if (word) current.timer = window.setTimeout(() => {
      if (press !== current || doc.visibilityState !== "visible") return;
      current.selecting = true;
      logGesture("hold", { ms: Math.round(performance.now() - current.startedAt) });
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
      if (current.travel > movementTolerance) {
        if (!current.moveLogged) logGesture("touchmove-past-tolerance", { travel: Math.round(current.travel), cancelable: event.cancelable });
        current.moveLogged = true;
        window.clearTimeout(current.timer);
      }
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
    logGesture("touchend", {
      outcome, ms: Math.round(record.endedAt - current.startedAt), travel: Math.round(current.travel),
      selecting: current.selecting, cancelable: event.cancelable,
    });
    onPress?.(record, event.target as Element | null);
    if (current.selecting) {
      event.preventDefault();
      event.stopImmediatePropagation();
      onRelease();
      for (const delay of selectionSampleMs) window.setTimeout(() => {
        if (!signal.aborted) logSelection(doc, `release+${delay}`);
      }, delay);
    }
  }, options);

  // iOS sends mouse events and a click about 40 ms after a long press, even when `touchend` was cancelled.
  // Their default action collapses the selection the hold just made, so the hold owns them.
  for (const type of ["mousedown", "mouseup"] as const) {
    doc.addEventListener(type, event => {
      if (recentPress(doc)?.outcome !== "hold") return;
      event.preventDefault();
      logGesture("mouse-guard", { type });
    }, options);
  }

  doc.addEventListener("touchcancel", () => {
    logGesture("touchcancel", {
      ms: press ? Math.round(performance.now() - press.startedAt) : undefined,
      travel: press ? Math.round(press.travel) : undefined, selecting: press?.selecting,
    });
    if (press?.selecting) doc.getSelection()?.removeAllRanges();
    reset();
  }, options);

  doc.addEventListener("contextmenu", event => {
    logGesture("contextmenu", { press: Boolean(press) });
    if (press) event.preventDefault();
  }, options);

  let release: number | undefined;
  let wasCollapsed = true;
  doc.addEventListener("selectionchange", () => {
    // Only transitions are logged: they show what the system did to the selection, without text.
    const collapsed = doc.getSelection()?.isCollapsed ?? true;
    if (collapsed !== wasCollapsed) logSelection(doc, collapsed ? "collapsed" : "expanded");
    wasCollapsed = collapsed;
    window.clearTimeout(release);
    // WebKit can report a collapsed selection for a moment while it swaps ranges.
    release = window.setTimeout(() => {
      if (doc.getSelection()?.isCollapsed ?? true) root.removeAttribute("data-reader-selectable");
    }, selectableReleaseMs);
  }, { signal });

  signal.addEventListener("abort", () => {
    window.clearTimeout(release);
    reset();
  }, { once: true });
}
