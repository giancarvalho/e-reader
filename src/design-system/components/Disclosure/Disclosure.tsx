import type { ReactNode } from "react";
import styles from "./Disclosure.module.css";

type DisclosureProps = {
  summary: ReactNode;
  children: ReactNode;
  /** Whether it starts open. The reader can toggle it afterwards. */
  open?: boolean;
};

/** A native expandable group with a tappable summary. */
export function Disclosure({ summary, open, children }: DisclosureProps) {
  return (
    <details className={styles.disclosure} open={open}>
      <summary className={styles.summary}>{summary}</summary>
      {children}
    </details>
  );
}
