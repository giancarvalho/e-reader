"use client";

import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { Button } from "@/design-system/components/Button";
import { Link } from "@/design-system/components/Link";
import { Notice } from "@/design-system/components/Notice";
import { Sheet } from "@/design-system/components/Sheet";
import { Text } from "@/design-system/components/Text";
import { contrastRatio, type ReaderPreferences, type ReadingPosition } from "@/lib/reader/model";
import type { AnnotationSelection } from "@/features/annotations";
import type { Annotation } from "@/lib/sync/annotations";
import { formatPercent } from "@/lib/format";
import { messages } from "@/lib/messages/pt-br";
import type { TocEntry } from "@/vendor/foliate/epub";
import type { View } from "@/vendor/foliate/view";
import styles from "./reader.module.css";
import { bindWordPress, pressInProgress } from "./word-press";

type Props = {
  title: string;
  annotationCount: number;
  onOpenAnnotations: () => void;
  file: Blob;
  initialCfi?: string;
  preferences: ReaderPreferences;
  onPosition: (position: ReadingPosition) => void;
  onPreferences: (preferences: ReaderPreferences) => void;
  annotations: Annotation[];
  commentCounts: Map<string, number>;
  annotationTarget?: { cfi: string };
  selectionReset: number;
  onSelection: (value: AnnotationSelection) => void;
  onAnnotation: (id: string, anchor?: () => { x: number; top: number; bottom: number } | undefined) => void;
  onDismissAnnotation: () => boolean;
  onChapter: (index: number) => void;
  onChapters: (chapters: Record<string, { index: number; label: string }>) => void;
  children: ReactNode;
};

export function ReaderCanvas({
  title, annotationCount, onOpenAnnotations, file, initialCfi, preferences, onPosition, onPreferences, annotations, commentCounts, annotationTarget,
  onSelection, onAnnotation, onDismissAnnotation, onChapter, onChapters, selectionReset, children,
}: Props) {
  const readerSurface = useRef<HTMLElement>(null);
  const mount = useRef<HTMLDivElement>(null);
  const viewRef = useRef<View>(null);
  const lastCfi = useRef(initialCfi);
  const [controls, setControls] = useState(false);
  const [panel, setPanel] = useState<"toc" | "appearance">();
  const [location, setLocation] = useState({ fraction: 0, chapter: undefined as string | undefined, href: undefined as string | undefined });
  const [toc, setToc] = useState<TocEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const appearance = useRef(preferences);
  const applied = useRef<ReaderPreferences>(null);
  const { reader } = messages;
  const rendered = useRef(new Map<string, DrawnAnnotation>());
  const pendingDraw = useRef(Promise.resolve());
  const reportSelection = useEffectEvent(onSelection);
  const reportAnnotation = useEffectEvent(onAnnotation);
  const dismissAnnotation = useEffectEvent(onDismissAnnotation);
  const reportChapter = useEffectEvent(onChapter);
  const reportChapters = useEffectEvent(onChapters);
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
    let selectionSettle: number | undefined;
    let pointerId: number | undefined;
    let words: AbortController | undefined;
    let previousSelection = "";
    let tap: { event: MouseEvent; annotationHit: boolean } | undefined;
    const overlaysReceiveTaps = new WeakSet<Document>();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    function applyMotion() {
      view?.renderer?.toggleAttribute("animated", !reducedMotion.matches);
    }

    function turn(direction: "prev" | "next") {
      if (recording) void view?.[direction]().catch(() => setFailed(true));
    }

    function readKey(event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey
        || (event.target as Element | null)?.closest?.("button, a, input, textarea, select, dialog, [role=dialog], [contenteditable]")
        || (view?.renderer?.getContents().some(({ doc }) => Boolean(doc.getSelection()?.toString())))) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        turn(event.key === "ArrowLeft" ? "prev" : "next");
      }
    }

    function readTap(event: MouseEvent) {
      const currentTap = { event, annotationHit: false };
      tap = currentTap;
      const doc = event.currentTarget as Document;
      const area = content?.getBoundingClientRect();
      const bounds = doc.defaultView?.frameElement?.getBoundingClientRect();
      const interactive = (event.target as Element | null)?.closest?.("a, button, input, select, textarea");
      window.setTimeout(() => {
        if (tap === currentTap) tap = undefined;
        if (cancelled || currentTap.annotationHit || event.button !== 0) return;
        if (dismissAnnotation() || event.defaultPrevented || event.detail > 1 || interactive ||
          doc.getSelection()?.toString() || !area?.width || !bounds) return;
        const fraction = (bounds.left + event.clientX - area.left) / area.width;
        if (fraction < 0.22) turn("prev");
        else if (fraction > 0.78) turn("next");
        else setControls(value => !value);
      }, 0);
    }

    window.addEventListener("keydown", readKey);

    function inspectSelection() {
      if (!view?.renderer || pointerId !== undefined || document.visibilityState !== "visible") return;
      for (const { doc, index } of view.renderer.getContents()) {
        if (pressInProgress(doc)) continue;
        const selected = doc.getSelection();
        const quote = selected?.toString().trim().slice(0, 4000);
        if (!quote || !selected?.rangeCount) continue;
        try {
          const cfi = view.getCFI(index, textRange(doc, selected.getRangeAt(0)));
          if (cfi.length <= 4096 && cfi !== previousSelection) {
            previousSelection = cfi;
            window.clearTimeout(selectionSettle);
            selectionSettle = window.setTimeout(() => {
              if (!cancelled && pointerId === undefined && !pressInProgress(doc) && doc.getSelection()?.toString().trim().slice(0, 4000) === quote) {
                reportSelection({ cfi, quote, sample: doc.body?.textContent?.slice(0, 5000) });
              }
            }, 180);
          }
        } catch {
          // A selection can disappear while the paginator changes chapters.
        }
        return;
      }
      previousSelection = "";
      window.clearTimeout(selectionSettle);
    }
    lastCfi.current = initialCfi;

    function openAnnotation(id: string, range?: Range, point?: { x: number; y: number }) {
      reportAnnotation(id, () => {
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
        const line = point && visible.find(rect => {
          const x = bounds.left + point.x;
          const y = bounds.top + point.y;
          return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
        }) || visible[0];
        if (line) return { x: (line.left + line.right) / 2, top: line.top, bottom: line.bottom };
      });
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
        // Some browsers suppress events in a script-disabled EPUB iframe.
        let receivesEvents = false;
        const eventType = "foliate-input-probe";
        const probe = () => { receivesEvents = true; };
        doc.addEventListener(eventType, probe, { once: true });
        doc.documentElement.dispatchEvent(new Event(eventType, { bubbles: true }));
        doc.removeEventListener(eventType, probe);
        if (!receivesEvents) overlaysReceiveTaps.add(doc);
        pointerId = undefined;
        words?.abort();
        words = new AbortController();
        bindWordPress(doc, words.signal, () => {
          pointerId = undefined;
          inspectSelection();
        });
        doc.addEventListener("pointerdown", event => {
          pointerId = event.pointerId;
          previousSelection = "";
          window.clearTimeout(selectionSettle);
        });
        const endPointer = (event: PointerEvent) => {
          if (pointerId !== event.pointerId) return;
          pointerId = undefined;
          inspectSelection();
        };
        doc.addEventListener("pointerup", endPointer);
        doc.addEventListener("pointercancel", endPointer);
        doc.addEventListener("pointerout", event => {
          if (!event.relatedTarget) endPointer(event);
        });
        doc.addEventListener("selectionchange", inspectSelection);
        doc.addEventListener("keydown", readKey);
        doc.addEventListener("click", readTap, true);
      });
      view.addEventListener("draw-annotation", event => {
        const { annotation, doc, draw, range } = (event as CustomEvent<{
          annotation: DrawnAnnotation;
          doc: Document;
          range: Range;
          draw: (method: typeof Overlayer.highlight, options: { color: string; opacity: number }) => void;
        }>).detail;
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
              openAnnotation(annotation.id, range, point);
            });
          }
          return overlay;
        }, { color: annotation.color, opacity: 0.38 });
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
        }
      });
      applyMotion();
      reducedMotion.addEventListener("change", applyMotion);
      // A sandboxed iframe can omit selectionchange events in WebKit.
      selectionTimer = window.setInterval(inspectSelection, 200);
      setToc(book.toc ?? []);
      applied.current = appearance.current;
      view.renderer.setStyles(readerStyles(applied.current));
      await view.init({ lastLocation: initialCfi, showTextStart: true });
      recording = true;
      if (!cancelled) setReady(true);
    }

    void open().catch(() => {
      window.clearInterval(selectionTimer);
      window.clearTimeout(selectionSettle);
      words?.abort();
      view?.close();
      view?.remove();
      destroy?.();
      if (!cancelled) setFailed(true);
    });
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", readKey);
      reducedMotion.removeEventListener("change", applyMotion);
      window.clearInterval(selectionTimer);
      window.clearTimeout(selectionSettle);
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
    const surface = readerSurface.current;
    if (!surface || preferences.theme === "auto") return;
    const theme = document.createElement("meta");
    theme.name = "theme-color";
    theme.content = getComputedStyle(surface).backgroundColor;
    document.head.prepend(theme);
    return () => { theme.remove(); };
  }, [preferences.theme, preferences.background]);

  useEffect(() => {
    if (ready && viewRef.current) void refresh(viewRef.current);
  }, [annotations, commentCounts, ready]);

  useEffect(() => {
    for (const { doc } of viewRef.current?.renderer.getContents() ?? []) doc.getSelection()?.removeAllRanges();
  }, [selectionReset]);

  useEffect(() => {
    if (annotationTarget && viewRef.current) void viewRef.current.goTo(annotationTarget.cfi).catch(() => setFailed(true));
  }, [annotationTarget]);

  async function navigate(operation: () => Promise<void> | undefined) {
    try {
      await operation();
    } catch {
      setFailed(true);
    }
  }

  const position = formatPercent(location.fraction);
  const controlLabel = controls ? reader.hideControls : reader.showControls;
  return (
    <section ref={readerSurface} className={styles.reader} data-theme={preferences.theme} style={preferences.theme === "custom" ? { backgroundColor: preferences.background } : undefined} aria-label={title}>
      {failed && <div className={styles.state}><Notice live="alert">{reader.failed}</Notice>
        <Link href="/estante">{reader.shelf}</Link></div>}
      <div ref={mount} className={styles.viewport} />
      {ready && !failed && <>
        {controls && <header className={styles.toolbarTop}>
          <a className={styles.back} href="/estante" aria-label={reader.shelf}>‹</a>
          <h1 title={title}>{title}</h1>
          <Button variant="icon" aria-label={reader.appearance} onClick={() => setPanel("appearance")}>Aa</Button>
        </header>}
        <footer className={controls ? styles.toolbarBottom : styles.progressOnly}>
          {controls && <nav className={styles.tools} aria-label={reader.showControls}>
            <Button variant="icon" aria-label={reader.previous} onClick={() => navigate(() => viewRef.current?.prev())}>‹</Button>
            {toc.length > 0 && <Button variant="quiet" onClick={() => setPanel("toc")}>{reader.toc}</Button>}
            <Button variant="quiet" onClick={onOpenAnnotations}>{messages.annotations.list} ({annotationCount})</Button>
            <Button variant="icon" aria-label={reader.next} onClick={() => navigate(() => viewRef.current?.next())}>›</Button>
          </nav>}
          <button className={styles.progress} type="button" aria-label={controlLabel} aria-expanded={controls}
            onClick={() => setControls(value => !value)}>
            {location.chapter && <span>{location.chapter}</span>}
            <span>{position}</span>
          </button>
        </footer>
        {panel === "toc" && <Sheet title={reader.toc} closeLabel={reader.closePanel} onClose={() => setPanel(undefined)}>
          <TocList entries={toc} current={location.href} goTo={target => {
            void navigate(() => viewRef.current?.goTo(target));
            setPanel(undefined);
            setControls(false);
          }} />
        </Sheet>}
        {panel === "appearance" && <Sheet title={reader.appearance} closeLabel={reader.closePanel} onClose={() => setPanel(undefined)}>
          <Appearance preferences={preferences} change={onPreferences} />
        </Sheet>}
        {children}
      </>}
    </section>
  );
}

function TocList({ entries, current, goTo }: { entries: TocEntry[]; current?: string; goTo: (href: string) => void }) {
  return (
    <ul className={styles.toc}>
      {entries.map((entry, index) => (
        <li key={`${entry.href}-${index}`}>
          <Button variant={entry.href === current ? "secondary" : "quiet"} aria-current={entry.href === current ? "location" : undefined}
            onClick={() => goTo(entry.href)}>{entry.label}</Button>
          {entry.subitems?.length ? <TocList entries={entry.subitems} current={current} goTo={goTo} /> : null}
        </li>
      ))}
    </ul>
  );
}

const sepia = { background: "#EFDFC2", ink: "#39271C" };

function Appearance({ preferences, change }: {
  preferences: ReaderPreferences; change: (value: ReaderPreferences) => void;
}) {
  const { reader } = messages;
  const theme = preferences.theme === "custom" && preferences.background === sepia.background && preferences.ink === sepia.ink
    ? "sepia" : preferences.theme;
  function size(value: number) {
    change({ ...preferences, size: Math.min(36, Math.max(12, value)) });
  }

  return (
    <div className={styles.settings}>
      <fieldset>
        <legend>{reader.textSize}</legend>
        <div className={styles.size}>
          <Button variant="secondary" aria-label={reader.smaller} disabled={preferences.size <= 12}
            onClick={() => size(preferences.size - 1)}>A−</Button>
          <output>{preferences.size}</output>
          <Button variant="secondary" aria-label={reader.larger} disabled={preferences.size >= 36}
            onClick={() => size(preferences.size + 1)}>A+</Button>
        </div>
      </fieldset>
      <fieldset>
        <legend>{reader.font}</legend>
        <div className={styles.options}>
          {(["serif", "sans"] as const).map(font => <Button key={font} variant={preferences.font === font ? "primary" : "secondary"}
            aria-pressed={preferences.font === font} onClick={() => change({ ...preferences, font })}>{reader[font]}</Button>)}
        </div>
      </fieldset>
      <fieldset>
        <legend>{reader.theme}</legend>
        <div className={styles.options}>
          {(["auto", "day", "sepia", "night", "custom"] as const).map(value => <Button key={value}
            variant={theme === value ? "primary" : "secondary"} aria-pressed={theme === value}
            onClick={() => change(value === "sepia" ? { ...preferences, ...sepia, theme: "custom" } : { ...preferences, theme: value })}>
            {reader[value]}
          </Button>)}
        </div>
      </fieldset>
      {theme === "custom" && <>
        <label>{reader.background} <input type="color" value={preferences.background}
          onChange={event => change({ ...preferences, background: event.target.value })} /></label>
        <label>{reader.ink} <input type="color" value={preferences.ink}
          onChange={event => change({ ...preferences, ink: event.target.value })} /></label>
        {contrastRatio(preferences.background, preferences.ink) < 4.5 && <Text>{reader.lowContrast}</Text>}
      </>}
    </div>
  );
}

function readerStyles(preferences: ReaderPreferences) {
  const scheme = preferences.theme === "night" ? "dark" : "light";
  const probe = document.createElement("div");
  document.body.append(probe);
  const palette = (theme: "day" | "night") => {
    probe.dataset.theme = theme;
    const computed = getComputedStyle(probe);
    return `color: ${computed.getPropertyValue("--color-ink")} !important; background: ${computed.getPropertyValue("--color-bg")} !important;`;
  };
  const safeColor = (value: string, fallback: string) => /^#[a-f0-9]{6}$/i.test(value) ? value : fallback;
  const colors = preferences.theme === "custom"
    ? `color: ${safeColor(preferences.ink, "#2B2420")} !important; background: ${safeColor(preferences.background, "#FAF5EC")} !important;`
    : palette(scheme === "dark" ? "night" : "day");
  const auto = preferences.theme === "auto"
    ? `@media (prefers-color-scheme: dark) { html, body { ${palette("night")} } }`
    : "";
  probe.remove();
  return `
    html[data-reader-word-press="pending"], html[data-reader-word-press="pending"] * {
      -webkit-user-select: none !important; user-select: none !important;
    }
    @media (pointer: coarse) { html { -webkit-touch-callout: none; } }
    html, body { ${colors} color-scheme: ${preferences.theme === "auto" ? "light dark" : scheme}; }
    body { font: ${preferences.size}px/1.55 ${preferences.font === "serif" ? "serif" : "sans-serif"} !important; }
    p, li, blockquote { color: inherit !important; font-family: inherit !important; font-size: 1em !important; }
    ${auto}
  `;
}

type DrawnAnnotation = { id: string; value: string; color: string; hasComments: boolean; quote: string };

function textRange(doc: Document, selection: Range) {
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

function drawing(row: Annotation, hasComments: boolean): DrawnAnnotation {
  const token = row.color === "amber" ? "--color-amber" : `--highlight-${row.color}`;
  return {
    id: row.id, value: row.cfi, hasComments, quote: row.quote_text, color: getComputedStyle(document.documentElement).getPropertyValue(token).trim(),
  };
}
