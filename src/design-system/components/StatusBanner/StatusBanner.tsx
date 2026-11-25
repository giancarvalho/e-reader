import type { ReactNode } from "react";
import { Text } from "../Text";
import styles from "./StatusBanner.module.css";

export function StatusBanner({ children, action, tone = "info" }: {
  children: ReactNode;
  action?: ReactNode;
  tone?: "info" | "warning";
}) {
  return (
    <aside className={styles.banner} data-tone={tone}>
      <div role="status"><Text>{children}</Text></div>
      {action}
    </aside>
  );
}
