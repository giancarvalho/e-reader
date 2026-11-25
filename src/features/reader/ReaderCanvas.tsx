"use client";

import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { Button } from "@/design-system/components/Button";
import { Text } from "@/design-system/components/Text";
import { contrastRatio, type ReaderPreferences, type ReadingPosition } from "@/lib/reader/model";
import type { AnnotationSelection } from "@/features/annotations";
import type { Annotation } from "@/lib/sync/annotations";
import { messages } from "@/lib/messages/pt-br";
import type { TocEntry } from "@/vendor/foliate/epub";
import type { View } from "@/vendor/foliate/view";
import styles from "./reader.module.css";

type Props = {
  file: Blob;
  initialCfi?: string;
  preferences: ReaderPreferences;
  onPosition: (position: ReadingPosition) => void;
  onPreferences: (preferences: ReaderPreferences) => void;
  annotations: Annotation[];
  annotationTarget?: { cfi: string };
  onSelection: (value: AnnotationSelection) => void;
  onAnnotation: (id: string) => void;
  onChapter: (index: number) => void;
  onChapters: (chapters: Record<string, { index: number; label: string }>) => void;
  children: ReactNode;
};

export function ReaderCanvas({
  file, initialCfi, preferences, onPosition, onPreferences, annotations, annotationTarget,
  onSelection, onAnnotation, onChapter, onChapters, children,
}: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const viewRef = useRef<View>(null);
  const lastCfi = useRef(initialCfi);
  const [toc, setToc] = useState<TocEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const appearance = useRef(preferences);
  const applied = useRef<ReaderPreferences>(null);
  const { reader } = messages;
  const rendered = useRef(new Map<string, DrawnAnnotation>());
  const reportSelection = useEffectEvent(onSelection);
  const reportAnnotation = useEffectEvent(onAnnotation);
  const reportChapter = useEffectEvent(onChapter);
  const reportChapters = useEffectEvent(onChapters);
  const refresh = useEffectEvent(async (view: View) => {
    const current = new Map(annotations.map(row => [row.id, drawing(row)]));
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

  useEffect(() => {
    let cancelled = false;
    let view: View | undefined;
    let destroy: (() => void) | undefined;
    const content = mount.current;
    let recording = false;
    let selectionTimer: number | undefined;
    let previousSelection = "";

    function inspectSelection() {
      if (!view?.renderer || document.visibilityState !== "visible") return;
      for (const { doc, index } of view.renderer.getContents()) {
        const selected = doc.getSelection();
        const quote = selected?.toString().trim().slice(0, 4000);
        if (!quote || !selected?.rangeCount) continue;
        try {
          const cfi = view.getCFI(index, selected.getRangeAt(0));
          if (cfi.length <= 4096 && cfi !== previousSelection) {
            previousSelection = cfi;
            reportSelection({ cfi, quote, sample: doc.body?.textContent?.slice(0, 5000) });
          }
        } catch {
          // A selection can disappear while the paginator changes chapters.
        }
        return;
      }
      previousSelection = "";
    }
    lastCfi.current = initialCfi;

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
        const { doc } = (event as CustomEvent<{ doc: Document }>).detail;
        doc.addEventListener("selectionchange", inspectSelection);
      });
      view.addEventListener("draw-annotation", event => {
        const { annotation, draw } = (event as CustomEvent<{
          annotation: DrawnAnnotation;
          draw: (method: typeof Overlayer.highlight, options: { color: string; opacity: number }) => void;
        }>).detail;
        draw(Overlayer.highlight, { color: annotation.color, opacity: 0.38 });
      });
      view.addEventListener("show-annotation", event => {
        reportAnnotation((event as CustomEvent<{ value: string }>).detail.value);
      });
      view.addEventListener("create-overlay", () => {
        if (view) queueMicrotask(() => { if (viewRef.current === view && view) void refresh(view); });
      });
      view.addEventListener("relocate", event => {
        const { cfi, fraction, index } = (event as CustomEvent<ReadingPosition & { index: number }>).detail;
        reportChapter(index);
        if (cfi && Number.isFinite(fraction)) {
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
      // A sandboxed iframe can omit selectionchange events in WebKit.
      selectionTimer = window.setInterval(inspectSelection, 350);
      setToc(book.toc ?? []);
      applied.current = appearance.current;
      view.renderer.setStyles(readerStyles(applied.current));
      await view.init({ lastLocation: initialCfi, showTextStart: true });
      recording = true;
      if (!cancelled) setReady(true);
    }

    void open().catch(() => {
      window.clearInterval(selectionTimer);
      view?.close();
      view?.remove();
      destroy?.();
      if (!cancelled) setFailed(true);
    });
    return () => {
      cancelled = true;
      window.clearInterval(selectionTimer);
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
  }, [annotations, ready]);

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

  return (
    <>
      {!ready && !failed && <Text>{reader.loading}</Text>}
      {failed && <div role="alert"><Text>{reader.failed}</Text></div>}
      <div ref={mount} className={styles.viewport} />
      {ready && !failed && (
        <div className={styles.controls}>
          <div className={styles.actions}>
            <Button variant="secondary" onClick={() => navigate(() => viewRef.current?.prev())}>{reader.previous}</Button>
            <Button onClick={() => navigate(() => viewRef.current?.next())}>{reader.next}</Button>
          </div>
          {toc.length > 0 && (
            <details>
              <summary>{reader.toc}</summary>
              <TocList entries={toc} goTo={target => navigate(() => viewRef.current?.goTo(target))} />
            </details>
          )}
          {children}
          <div className={styles.settings}>
            <label>{reader.textSize} <input type="range" min={12} max={36} value={preferences.size}
              onChange={event => onPreferences({ ...preferences, size: event.target.valueAsNumber })} /></label>
            <label>{reader.font} <select value={preferences.font}
              onChange={event => onPreferences({ ...preferences, font: event.target.value === "serif" ? "serif" : "sans" })}>
              <option value="serif">{reader.serif}</option><option value="sans">{reader.sans}</option>
            </select></label>
            <label>{reader.theme} <select value={preferences.theme}
              onChange={event => {
                const theme = event.target.value;
                onPreferences({ ...preferences, theme: theme === "day" || theme === "night" || theme === "custom" ? theme : "auto" });
              }}>
              <option value="auto">{reader.auto}</option><option value="day">{reader.day}</option><option value="night">{reader.night}</option>
              <option value="custom">{reader.custom}</option>
            </select></label>
            {preferences.theme === "custom" && <>
              <label>{reader.background} <input type="color" value={preferences.background}
                onChange={event => onPreferences({ ...preferences, background: event.target.value })} /></label>
              <label>{reader.ink} <input type="color" value={preferences.ink}
                onChange={event => onPreferences({ ...preferences, ink: event.target.value })} /></label>
              {contrastRatio(preferences.background, preferences.ink) < 4.5 && <Text>{reader.lowContrast}</Text>}
            </>}
          </div>
        </div>
      )}
    </>
  );
}

function TocList({ entries, goTo }: { entries: TocEntry[]; goTo: (href: string) => void }) {
  return (
    <ul>
      {entries.map((entry, index) => (
        <li key={`${entry.href}-${index}`}>
          <Button variant="quiet" onClick={() => goTo(entry.href)}>{entry.label}</Button>
          {entry.subitems?.length ? <TocList entries={entry.subitems} goTo={goTo} /> : null}
        </li>
      ))}
    </ul>
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
    html, body { ${colors} color-scheme: ${preferences.theme === "auto" ? "light dark" : scheme}; }
    body { font: ${preferences.size}px/1.55 ${preferences.font === "serif" ? "serif" : "sans-serif"} !important; }
    p, li, blockquote { color: inherit !important; font-family: inherit !important; font-size: 1em !important; }
    ${auto}
  `;
}

type DrawnAnnotation = { id: string; value: string; color: string };

function drawing(row: Annotation): DrawnAnnotation {
  const token = row.color === "amber" ? "--color-amber" : `--highlight-${row.color}`;
  return {
    id: row.id, value: row.cfi, color: getComputedStyle(document.documentElement).getPropertyValue(token).trim(),
  };
}
