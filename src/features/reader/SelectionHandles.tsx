"use client";

import { useCallback, useLayoutEffect, useRef, type KeyboardEvent, type PointerEvent } from "react";
import { Button } from "@/design-system/components/Button";
import { observeViewport } from "@/design-system/viewport";
import { messages } from "@/lib/messages/pt-br";
import type { ReaderSelection } from "./reader-selection";
import { edgePoint, nextWord, rangeDocument, withMovedEdge, type SelectionEdge } from "./selection-geometry";
import { applyTextSelection, wordAtPoint } from "./word-press";
import styles from "./reader.module.css";

const edges = ["start", "end"] as const;
type Drag = { pointer: number; edge: SelectionEdge; xOffset: number; yOffset: number; draft: Range };

function placeHandle(node: HTMLButtonElement, edge: SelectionEdge, range: Range, area?: DOMRect) {
  const point = edgePoint(range, edge, area);
  node.style.visibility = point ? "visible" : "hidden";
  if (!point) return;
  node.style.left = `${point.x}px`;
  node.style.top = `${point.y}px`;
  node.dataset.outward = point.outward;
}

export function SelectionHandles({ selection, onAdjusting }: {
  selection: ReaderSelection;
  onAdjusting: (adjusting: boolean) => void;
}) {
  const handles = useRef<HTMLDivElement>(null);
  const active = useRef<Drag>(null);
  const { range, frameArea, commit } = selection;
  const place = useCallback((current: Range) => {
    const area = frameArea();
    handles.current?.querySelectorAll("button").forEach((node, index) => placeHandle(node, edges[index], current, area));
  }, [frameArea]);

  useLayoutEffect(() => {
    const doc = rangeDocument(range);
    const reposition = () => place(active.current?.draft ?? range);
    reposition();
    const stopObserving = observeViewport(reposition);
    return () => {
      stopObserving();
      doc.documentElement.removeAttribute("data-reader-range-adjusting");
    };
  }, [range, place]);

  function start(event: PointerEvent<HTMLButtonElement>, edge: SelectionEdge) {
    if (active.current || event.button !== 0) return;
    const point = edgePoint(range, edge, frameArea());
    if (!point) return;
    event.preventDefault();
    // The menu sees document presses as dismissal. A handle belongs to this selection.
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    active.current = { pointer: event.pointerId, edge, draft: range,
      xOffset: event.clientX - point.x, yOffset: event.clientY - point.y + point.height / 2 };
    rangeDocument(range).documentElement.setAttribute("data-reader-range-adjusting", "");
    onAdjusting(true);
  }

  function move(event: PointerEvent<HTMLButtonElement>) {
    const drag = active.current;
    if (!drag || event.pointerId !== drag.pointer) return;
    const doc = rangeDocument(range);
    const frame = doc.defaultView?.frameElement?.getBoundingClientRect();
    const area = frameArea();
    if (!frame || !area) return;
    const x = event.clientX - drag.xOffset;
    const y = event.clientY - drag.yOffset;
    if (x < area.left || x > area.right || y < area.top || y > area.bottom) return;
    const word = wordAtPoint(doc, x - frame.left, y - frame.top, true);
    const next = word && withMovedEdge(drag.draft, drag.edge, word);
    if (!next) return;
    drag.draft = next;
    applyTextSelection(doc, next);
    place(next);
  }

  function finish(event: PointerEvent<HTMLButtonElement>) {
    const drag = active.current;
    if (!drag || event.pointerId !== drag.pointer) return;
    active.current = null;
    const doc = rangeDocument(range);
    if (event.type !== "pointerup" || !commit(drag.draft)) {
      applyTextSelection(doc, range);
      place(range);
    }
    doc.documentElement.removeAttribute("data-reader-range-adjusting");
    onAdjusting(false);
  }

  function adjustWithKeyboard(event: KeyboardEvent<HTMLButtonElement>, edge: SelectionEdge) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const rtl = rangeDocument(range).defaultView?.getComputedStyle(range.startContainer.parentElement!).direction === "rtl";
    const word = nextWord(range, edge, (event.key === "ArrowRight") !== rtl);
    const next = word && withMovedEdge(range, edge, word);
    if (!next) return;
    const doc = rangeDocument(range);
    applyTextSelection(doc, next);
    if (!commit(next)) applyTextSelection(doc, range);
  }

  return (
    <div className={styles.selectionHandles} ref={handles}>
      {edges.map(edge => <Button key={edge} variant="handle" aria-label={messages.annotations.selectionHandle[edge]}
        onPointerDown={event => start(event, edge)} onPointerMove={move} onPointerUp={finish}
        onPointerCancel={finish} onLostPointerCapture={finish} onKeyDown={event => adjustWithKeyboard(event, edge)} />)}
    </div>
  );
}
