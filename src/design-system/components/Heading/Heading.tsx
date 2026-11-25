import type { ReactNode } from "react";
import styles from "./Heading.module.css";

type HeadingProps = {
  children: ReactNode;
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
};

export function Heading({ children, as: Tag = "h1" }: HeadingProps) {
  return <Tag className={styles.heading}>{children}</Tag>;
}
