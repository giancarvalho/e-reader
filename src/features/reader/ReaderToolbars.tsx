import { Button } from "@/design-system/components/Button";
import { messages } from "@/lib/messages/pt-br";
import styles from "./reader-chrome.module.css";

export function ReaderTopBar({ title, onOpenAppearance }: { title: string; onOpenAppearance: () => void }) {
  const { reader } = messages;
  return (
    <header className={styles.toolbarTop}>
      <a className={styles.back} href="/estante" aria-label={reader.shelf}>‹</a>
      <h1 title={title}>{title}</h1>
      <Button variant="icon" aria-label={reader.appearance} onClick={onOpenAppearance}>Aa</Button>
    </header>
  );
}

type BottomBarProps = {
  controls: boolean;
  chapter?: string;
  position: string;
  hasToc: boolean;
  annotationCount: number;
  onToggleControls: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onOpenToc: () => void;
  onOpenAnnotations: () => void;
};

/** The reading progress strip, which expands into the page-turning tools when the controls are shown. */
export function ReaderBottomBar({
  controls, chapter, position, hasToc, annotationCount, onToggleControls, onPrevious, onNext, onOpenToc, onOpenAnnotations,
}: BottomBarProps) {
  const { reader } = messages;
  const controlLabel = controls ? reader.hideControls : reader.showControls;
  return (
    <footer className={controls ? styles.toolbarBottom : styles.progressOnly}>
      {controls && <nav className={styles.tools} aria-label={reader.showControls}>
        <Button variant="icon" aria-label={reader.previous} onClick={onPrevious}>‹</Button>
        {hasToc && <Button variant="quiet" onClick={onOpenToc}>{reader.toc}</Button>}
        <Button variant="quiet" onClick={onOpenAnnotations}>{messages.annotations.list} ({annotationCount})</Button>
        <Button variant="icon" aria-label={reader.next} onClick={onNext}>›</Button>
      </nav>}
      <button className={styles.progress} type="button" aria-label={controlLabel} aria-expanded={controls} onClick={onToggleControls}>
        {chapter && <span>{chapter}</span>}
        <span>{position}</span>
      </button>
    </footer>
  );
}
