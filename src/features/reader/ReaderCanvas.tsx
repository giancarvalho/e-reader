"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/design-system/components/Button";
import { Text } from "@/design-system/components/Text";
import type { ReadingPosition } from "@/lib/books/local";
import { messages } from "@/lib/messages/pt-br";
import type { TocEntry } from "@/vendor/foliate/epub";
import type { View } from "@/vendor/foliate/view";
import styles from "./reader.module.css";

export type ReaderPreferences = {
  theme: "auto" | "day" | "night";
  font: "serif" | "sans";
  size: number;
};

const defaults: ReaderPreferences = { theme: "auto", font: "serif", size: 18 };

function readPreferences() {
  try {
    const value = JSON.parse(localStorage.getItem("reader-preferences") ?? "null");
    if ((value?.theme === "auto" || value?.theme === "day" || value?.theme === "night")
      && (value.font === "serif" || value.font === "sans")
      && Number.isInteger(value.size) && value.size >= 12 && value.size <= 36) {
      return value as ReaderPreferences;
    }
  } catch {
    // The reader can open with defaults when browser storage is unavailable.
  }
  return defaults;
}

type Props = { file: Blob; initialCfi?: string; onPosition: (position: ReadingPosition) => void };

export function ReaderCanvas({ file, initialCfi, onPosition }: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const viewRef = useRef<View>(null);
  const lastCfi = useRef(initialCfi);
  const [toc, setToc] = useState<TocEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [preferences, setPreferences] = useState(defaults);
  const { reader } = messages;

  useEffect(() => {
    let cancelled = false;
    let view: View | undefined;
    let destroy: (() => void) | undefined;
    const content = mount.current;

    async function open() {
      const stored = readPreferences();
      const [{ View }, { openEpub }] = await Promise.all([
        import("@/vendor/foliate/view"), import("./epub-book"),
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
      view.addEventListener("relocate", event => {
        const { cfi, fraction } = (event as CustomEvent<ReadingPosition>).detail;
        if (cfi && Number.isFinite(fraction)) {
          lastCfi.current = cfi;
          onPosition({ cfi, fraction });
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
      setPreferences(stored);
      setToc(book.toc ?? []);
      view.renderer.setStyles(readerStyles(stored));
      await view.init({ lastLocation: initialCfi, showTextStart: true });
      if (!cancelled) setReady(true);
    }

    void open().catch(() => {
      view?.close();
      view?.remove();
      destroy?.();
      if (!cancelled) setFailed(true);
    });
    return () => {
      cancelled = true;
      view?.close();
      view?.remove();
      destroy?.();
      viewRef.current = null;
    };
  }, [file, initialCfi, onPosition]);

  function setAppearance(value: ReaderPreferences) {
    setPreferences(value);
    try {
      localStorage.setItem("reader-preferences", JSON.stringify(value));
    } catch {
      // Applies to the current reading session even if preferences cannot be stored.
    }
    const view = viewRef.current;
    if (!view) return;
    view.renderer.setStyles(readerStyles(value));
    if (lastCfi.current) void navigate(() => view.goTo(lastCfi.current!));
  }

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
          <div className={styles.settings}>
            <label>{reader.textSize} <input type="range" min={12} max={36} value={preferences.size}
              onChange={event => setAppearance({ ...preferences, size: event.target.valueAsNumber })} /></label>
            <label>{reader.font} <select value={preferences.font}
              onChange={event => setAppearance({ ...preferences, font: event.target.value === "serif" ? "serif" : "sans" })}>
              <option value="serif">{reader.serif}</option><option value="sans">{reader.sans}</option>
            </select></label>
            <label>{reader.theme} <select value={preferences.theme}
              onChange={event => {
                const theme = event.target.value;
                setAppearance({ ...preferences, theme: theme === "day" || theme === "night" ? theme : "auto" });
              }}>
              <option value="auto">{reader.auto}</option><option value="day">{reader.day}</option><option value="night">{reader.night}</option>
            </select></label>
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
  const colors = palette(scheme === "dark" ? "night" : "day");
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
