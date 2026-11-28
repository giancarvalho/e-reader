"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "@/design-system/components/Link";
import { Notice } from "@/design-system/components/Notice";
import { Sheet } from "@/design-system/components/Sheet";
import { formatPercent } from "@/lib/format";
import { messages } from "@/lib/messages/pt-br";
import { isDarkColor, type ReaderPreferences, type ReadingPosition } from "@/lib/reader/model";
import type { Annotation } from "@/lib/sync/annotations";
import { ReaderAppearance } from "./ReaderAppearance";
import { TocList } from "./ReaderToc";
import { ReaderBottomBar, ReaderTopBar } from "./ReaderToolbars";
import styles from "./reader.module.css";
import { useReaderView } from "./useReaderView";
import type { ReaderSelection } from "./reader-selection";

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
  onSelection: (value?: ReaderSelection) => void;
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
  const [controls, setControls] = useState(false);
  const [panel, setPanel] = useState<"toc" | "appearance">();
  const { reader } = messages;
  const { mount, viewRef, location, toc, ready, failed, setFailed } = useReaderView({
    file, initialCfi, preferences, annotations, commentCounts, annotationTarget, selectionReset,
    onPosition, onSelection, onAnnotation, onDismissAnnotation, onChapter, onChapters,
    onToggleControls: () => setControls(value => !value),
  });

  useEffect(() => {
    const surface = readerSurface.current;
    if (!surface) return;
    const root = document.documentElement;
    const previous = root.style.backgroundColor;
    let theme: HTMLMetaElement | undefined;
    function paint() {
      const color = getComputedStyle(surface!).backgroundColor;
      // The page behind the reader (system bars, overscroll, the gesture area) must match the reader's own theme.
      root.style.backgroundColor = color;
      theme ??= document.createElement("meta");
      theme.name = "theme-color";
      theme.content = color;
      if (!theme.isConnected) document.head.prepend(theme);
    }
    paint();
    return () => {
      theme?.remove();
      root.style.backgroundColor = previous;
    };
  }, [preferences.theme, preferences.background]);

  async function navigate(operation: () => Promise<void> | undefined) {
    try {
      await operation();
    } catch {
      setFailed(true);
    }
  }

  return (
    <section ref={readerSurface} className={styles.reader} data-theme={preferences.theme} data-tone={preferences.theme === "custom" ? (isDarkColor(preferences.background) ? "dark" : "light") : undefined}
      style={preferences.theme === "custom" ? { "--color-bg": preferences.background, "--color-ink": preferences.ink } as CSSProperties : undefined} aria-label={title}>
      {failed && <div className={styles.state}><Notice live="alert">{reader.failed}</Notice>
        <Link href="/estante">{reader.shelf}</Link></div>}
      <div ref={mount} className={styles.viewport} />
      {ready && !failed && <>
        {controls && <ReaderTopBar title={title} onOpenAppearance={() => setPanel("appearance")} />}
        <ReaderBottomBar controls={controls} chapter={location.chapter} position={formatPercent(location.fraction)}
          hasToc={toc.length > 0} annotationCount={annotationCount} onToggleControls={() => setControls(value => !value)}
          onPrevious={() => navigate(() => viewRef.current?.prev())} onNext={() => navigate(() => viewRef.current?.next())}
          onOpenToc={() => setPanel("toc")} onOpenAnnotations={onOpenAnnotations} />
        {panel === "toc" && <Sheet title={reader.toc} closeLabel={reader.closePanel} onClose={() => setPanel(undefined)}>
          <TocList entries={toc} current={location.href} goTo={target => {
            void navigate(() => viewRef.current?.goTo(target));
            setPanel(undefined);
            setControls(false);
          }} />
        </Sheet>}
        {panel === "appearance" && <Sheet title={reader.appearance} closeLabel={reader.closePanel} onClose={() => setPanel(undefined)}>
          <ReaderAppearance preferences={preferences} change={onPreferences} />
        </Sheet>}
        {children}
      </>}
    </section>
  );
}
