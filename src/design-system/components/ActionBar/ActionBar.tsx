import type { ReactNode } from "react";
import styles from "./ActionBar.module.css";

/**
 * A short row of actions docked at the bottom of the nearest positioned
 * ancestor, above its footer, wrapping onto more lines on narrow screens.
 */
export function ActionBar({ label, children }: { label: string; children: ReactNode }) {
  return <div className={styles.bar} role="group" aria-label={label}>{children}</div>;
}
