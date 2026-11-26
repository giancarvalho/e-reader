import type { ReactNode } from "react";
import { Text } from "../Text";
import styles from "./Notice.module.css";

type NoticeProps = {
  children?: ReactNode;
  /**
   * `status` is announced politely (progress, results). `alert` interrupts and
   * is for failures the person must notice.
   */
  live?: "status" | "alert";
  /** Announce the message to screen readers only, when another element already shows it. */
  announceOnly?: boolean;
};

/**
 * A short message that assistive technology announces. The region is always
 * rendered, even when empty, so later text is announced reliably.
 */
export function Notice({ children, live = "status", announceOnly = false }: NoticeProps) {
  return (
    <div className={styles.notice} role={live} data-announce-only={announceOnly || undefined}>
      {children ? <Text>{children}</Text> : null}
    </div>
  );
}
