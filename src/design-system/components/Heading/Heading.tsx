import type { ReactNode } from "react";
import styles from "./Heading.module.css";

type HeadingProps = {
  children: ReactNode;
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  /**
   * `page` is the editorial title of a screen or a featured item. `section`
   * titles a group inside a screen. `display` is the large title of the home.
   */
  variant?: "page" | "section" | "display";
};

export function Heading({ children, as: Tag = "h1", variant = "page" }: HeadingProps) {
  return <Tag className={styles.heading} data-variant={variant}>{children}</Tag>;
}
