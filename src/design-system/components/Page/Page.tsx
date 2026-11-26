import type { ReactNode } from "react";
import styles from "./Page.module.css";

type PageProps = {
  children: ReactNode;
  as?: "main" | "div" | "header" | "section";
  /**
   * `default` is a screen. `intro` leaves more room above the first heading
   * (forms and account screens). `banner` is a compact strip, such as an update notice.
   */
  variant?: "default" | "intro" | "banner";
};

/** The centered, safe-area aware column that holds a screen's content. */
export function Page({ as: Tag = "main", variant = "default", children }: PageProps) {
  return <Tag className={styles.page} data-variant={variant}>{children}</Tag>;
}
