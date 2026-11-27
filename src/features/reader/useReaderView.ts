"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { ReaderPreferences, ReadingPosition } from "@/lib/reader/model";
import type { Annotation } from "@/lib/sync/annotations";
import type { TocEntry } from "@/vendor/foliate/epub";
import type { View } from "@/vendor/foliate/view";
import { annotationAnchor, chapterReceivesEvents, drawAnnotation, drawing, type DrawDetail, type DrawnAnnotation } from "./annotation-overlay";
import { readerStyles } from "./reader-styles";
import styles from "./reader.module.css";
import { tapZone } from "./page-gestures";
import { bindWordPress, recentPress, type PressRecord } from "./word-press";
import { trackReaderSelection, type ReaderSelection } from "./reader-selection";

type Options = {
  file: Blob;
  initialCfi?: string;
  preferences: ReaderPreferences;
  annotations: Annotation[];
  commentCounts: Map<string, number>;
  annotationTarget?: { cfi: string };
  selectionReset: number;
  onPosition: (position: ReadingPosition) => void;
  onSelection: (value?: ReaderSelection) => void;
  onAnnotation: (id: string, anchor?: () => { x: number; top: number; bottom: number } | undefined) => void;
  onDismissAnnotation: () => boolean;
  onChapter: (index: number) => void;
  onChapters: (chapters: Record<string, { index: number; label: string }>) => void;
  onToggleControls: () => void;
};

/**
 * Opens the EPUB in the paginator and keeps it in step with the reading
 * preferences, the highlights, the selection and the reading position. The
 * reader's own chrome stays in ReaderCanvas.
 */
export function useReaderView({
  file, initialCfi, preferences, annotations, commentCounts, annotationTarget, selectionReset,
  onPosition, onSelection, onAnnotation, onDismissAnnotation, onChapter, onChapters, onToggleControls,
}: Options) {
  const mount = useRef<HTMLDivElement>(null);
  const viewRef = useRef<View>(null);
  const clearReaderSelection = useRef<(removeRanges: boolean) => void>(null);
  const lastCfi = useRef(initialCfi);
  const [location, setLocation] = useState({ fraction: 0, chapter: undefined as string | undefined, href: undefined as string | undefined });
  const [toc, setToc] = useState<TocEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const appearance = useRef(preferences);
  const applied = useRef<ReaderPreferences>(null);
  const rendered = useRef(new Map<string, DrawnAnnotation>());
  const pendingDraw = useRef(Promise.resolve());
  const reportSelection = useEffectEvent(onSelection);
  const reportAnnotation = useEffectEvent(onAnnotation);
  const dismissAnnotation = useEffectEvent(onDismissAnnotation);
  const reportChapter = useEffectEvent(onChapter);
  const reportChapters = useEffectEvent(onChapters);
  const toggleControls = useEffectEvent(onToggleControls);
  const refresh = useEffectEvent((view: View) => {
    const current = new Map(annotations.map(row => [row.id, drawing(row, (commentCounts.get(row.id) ?? 0) > 0)]));
    pendingDraw.current = pendingDraw.current.then(async () => {
      if (viewRef.current !== view) return;
      const removed = [...rendered.current.values()].filter(row => !current.has(row.id));
      await Promise.all(removed.map(row => view.deleteAnnotation(row).catch(() => undefined)));
      const labels: Record<string, { index: number; label: string }> = {};
      for (const row of current.values()) {
        const result = await view.addAnnotation(row).catch(() => null);
        if (result) labels[row.id] = result;
      }
      if (viewRef.current === view) {
        rendered.current = current;
        reportChapters(labels);
      }
    });
  });

  useEffect(() => {
    let cancelled = false;
    let view: View | undefined;
    let destroy: (() => void) | undefined;
    const content = mount.current;
    let recording = false;
    let readingPositionChanged = false;
    let selectionTimer: number | undefined;
    let pointerId: number | undefined;
    let words: AbortController | undefined;
    let tap: { event: MouseEvent; annotationHit: boolean } | undefined;
    let touchTapTimer: number | undefined;
    const overlaysReceiveTaps = new WeakSet<Document>();
    const selection = trackReaderSelection(() => view, content, () => !cancelled && pointerId === undefined, value => reportSelection(value));
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    function applyMotion() {
      view?.renderer?.toggleAttribute("animated", !reducedMotion.matches);
    }

    function turn(direction: "prev" | "next") {
      if (recording) void view?.[direction]().catch(() => setFailed(true));
    }

    function readKey(event: KeyboardEvent) {
      if (event.key === "Escape" && selection.shown) {
        event.preventDefault();
        selection.clear(true);
        return;
      }
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey
        || (event.target as Element | null)?.closest?.("button, a, input, textarea, select, dialog, [role=dialog], [contenteditable]")
        || (view?.renderer?.getContents().some(({ doc }) => Boolean(doc.getSelection()?.toString())))) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        turn(event.key === "ArrowLeft" ? "prev" : "next");
      }
    }

    function applyZone(doc: Document, clientX: number) {
      const area = content?.getBoundingClientRect();
      const bounds = doc.defaultView?.frameElement?.getBoundingClientRect();
      if (dismissAnnotation() || doc.getSelection()?.toString() || !area?.width || !bounds || selection.shown) return false;
      const zone = tapZone((bounds.left + clientX - area.left) / area.width);
      if (zone === "toggle") toggleControls();
      else turn(zone);
      return true;
    }

    function readTap(event: MouseEvent) {
      const doc = event.currentTarget as Document;
      const press = recentPress(doc);
      if (press) {
        // The touch that produced this click already decided what it was.
        window.clearTimeout(touchTapTimer);
        if (press.outcome !== "tap") return;
      }
      const currentTap = { event, annotationHit: false };
      tap = currentTap;
      const interactive = (event.target as Element | null)?.closest?.("a, button, input, select, textarea");
      window.setTimeout(() => {
        if (tap === currentTap) tap = undefined;
        if (cancelled || currentTap.annotationHit || event.button !== 0) return;
        // A mouse double click is a text gesture; quick touch taps are separate page turns.
        if (event.defaultPrevented || (!press && event.detail > 1) || interactive) {
          dismissAnnotation();
          return;
        }
        applyZone(doc, event.clientX);
      }, 0);
    }

    // iOS Safari does not reliably dispatch `click` for taps on plain text inside the chapter frame,
    // so a quick touch acts on its own if no click follows.
    function readTouchTap(press: PressRecord, target: Element | null, doc: Document) {
      window.clearTimeout(touchTapTimer);
      if (press.outcome !== "tap" || target?.closest?.("a, button, input, select, textarea")) return;
      touchTapTimer = window.setTimeout(() => {
        if (!cancelled) applyZone(doc, press.x);
      }, 350);
    }

    window.addEventListener("keydown", readKey);

    clearReaderSelection.current = selection.clear;
    lastCfi.current = initialCfi;

    function openAnnotation(id: string, range?: Range, point?: { x: number; y: number }) {
      reportAnnotation(id, () => annotationAnchor(content, range, { point }));
    }

    async function open() {
      const [{ View }, { openEpub }, { Overlayer }] = await Promise.all([
        import("@/vendor/foliate/view"), import("./epub-book"), import("@/vendor/foliate/overlayer"),
      ]);
      const book = await openEpub(file);
      destroy = () => book.destroy();
      if (cancelled || !content) {
        destroy();
        return;
      }

      view = new View();
      view.className = styles.canvas;
      view.addEventListener("external-link", event => event.preventDefault());
      view.addEventListener("load", event => {
        if (cancelled) return;
        const { doc } = (event as CustomEvent<{ doc: Document }>).detail;
        if (!chapterReceivesEvents(doc)) overlaysReceiveTaps.add(doc);
        pointerId = undefined;
        words?.abort();
        words = new AbortController();
        bindWordPress(doc, words.signal, () => {
          pointerId = undefined;
          selection.inspect();
        }, (press, target) => readTouchTap(press, target, doc));
        doc.addEventListener("pointerdown", event => {
          pointerId = event.pointerId;
          selection.pause();
        });
        const endPointer = (event: PointerEvent) => {
          if (pointerId !== event.pointerId) return;
          pointerId = undefined;
          selection.inspect();
        };
        doc.addEventListener("pointerup", endPointer);
        doc.addEventListener("pointercancel", endPointer);
        doc.addEventListener("pointerout", event => {
          if (!event.relatedTarget) endPointer(event);
        });
        doc.addEventListener("selectionchange", selection.inspect);
        doc.addEventListener("keydown", readKey);
        doc.addEventListener("click", readTap, true);
      });
      view.addEventListener("draw-annotation", event => {
        drawAnnotation((event as CustomEvent<DrawDetail>).detail, Overlayer, overlaysReceiveTaps, openAnnotation);
      });
      view.addEventListener("show-annotation", event => {
        if (tap) tap.annotationHit = true;
        const { value, range } = (event as CustomEvent<{ value: string; range?: Range }>).detail;
        const point = tap && { x: tap.event.clientX, y: tap.event.clientY };
        openAnnotation(value, range, point);
      });
      view.addEventListener("create-overlay", () => {
        if (view) queueMicrotask(() => { if (viewRef.current === view && view) void refresh(view); });
      });
      view.addEventListener("relocate", event => {
        const { cfi, fraction, index, tocItem } = (event as CustomEvent<ReadingPosition & {
          index: number; tocItem?: TocEntry;
        }>).detail;
        reportChapter(index);
        readingPositionChanged = Boolean(cfi && cfi !== lastCfi.current);
        if (cfi && Number.isFinite(fraction)) {
          setLocation({ fraction, chapter: tocItem?.label, href: tocItem?.href });
          if (recording && cfi !== lastCfi.current) onPosition({ cfi, fraction });
          lastCfi.current = cfi;
        }
      });

      content.append(view);
      await view.open(book);
      if (cancelled) {
        view.close();
        destroy();
        return;
      }
      viewRef.current = view;
      view.renderer.addEventListener("relocate", event => {
        const { reason } = (event as CustomEvent<{ reason: string }>).detail;
        // The paginator can snap to the same page after an ordinary touch.
        if (reason === "navigation" || reason === "page" || (reason === "snap" && readingPositionChanged)) {
          dismissAnnotation();
          if (selection.shown) selection.clear(true);
        }
      });
      applyMotion();
      reducedMotion.addEventListener("change", applyMotion);
      // A sandboxed iframe can omit selectionchange events in WebKit.
      selectionTimer = window.setInterval(selection.inspect, 200);
      setToc(book.toc ?? []);
      applied.current = appearance.current;
      view.renderer.setStyles(readerStyles(applied.current));
      await view.init({ lastLocation: initialCfi, showTextStart: true });
      recording = true;
      if (!cancelled) setReady(true);
    }

    void open().catch(() => {
      window.clearInterval(selectionTimer);
      window.clearTimeout(touchTapTimer);
      selection.pause();
      words?.abort();
      view?.close();
      view?.remove();
      destroy?.();
      if (!cancelled) setFailed(true);
    });
    return () => {
      cancelled = true;
      clearReaderSelection.current = null;
      window.removeEventListener("keydown", readKey);
      reducedMotion.removeEventListener("change", applyMotion);
      window.clearInterval(selectionTimer);
      window.clearTimeout(touchTapTimer);
      selection.pause();
      words?.abort();
      view?.close();
      view?.remove();
      destroy?.();
      viewRef.current = null;
    };
  }, [file, initialCfi, onPosition]);

  useEffect(() => {
    appearance.current = preferences;
    const view = viewRef.current;
    if (!view || applied.current === preferences) return;
    const cfi = lastCfi.current;
    applied.current = preferences;
    view.renderer.setStyles(readerStyles(preferences));
    if (cfi) void view.goTo(cfi).catch(() => setFailed(true));
  }, [preferences]);

  useEffect(() => {
    if (ready && viewRef.current) void refresh(viewRef.current);
  }, [annotations, commentCounts, ready]);

  useEffect(() => {
    clearReaderSelection.current?.(true);
  }, [selectionReset]);

  useEffect(() => {
    if (annotationTarget && viewRef.current) void viewRef.current.goTo(annotationTarget.cfi).catch(() => setFailed(true));
  }, [annotationTarget]);

  return { mount, viewRef, location, toc, ready, failed, setFailed };
}
