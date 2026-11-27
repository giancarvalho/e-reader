import type { ReactNode } from "react";
import styles from "./List.module.css";

/**
 * An unmarked list. `role="list"` keeps list semantics in browsers that drop
 * them when the markers are removed.
 */
export function List({ as: Tag = "ul", children }: { as?: "ul" | "ol"; children: ReactNode }) {
  return <Tag className={styles.list} role="list">{children}</Tag>;
}

/** A list item that stacks its children; `divided` adds a rule above it. */
export function ListItem({ divided = false, children }: { divided?: boolean; children: ReactNode }) {
  return <li className={styles.item} data-divided={divided || undefined}>{children}</li>;
}
