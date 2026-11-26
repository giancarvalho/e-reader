import type { ReactNode } from "react";
import { Notice } from "../Notice";
import styles from "./StatusBanner.module.css";

export function StatusBanner({ children, action, tone = "info" }: {
  children: ReactNode;
  action?: ReactNode;
  tone?: "info" | "warning";
}) {
  return (
    <aside className={styles.banner} data-tone={tone}>
      <Notice>{children}</Notice>
      {action}
    </aside>
  );
}
