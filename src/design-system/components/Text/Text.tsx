import type { ReactNode } from "react";
import styles from "./Text.module.css";

type TextProps = {
  children: ReactNode;
  variant?: "body" | "reading" | "label";
  tone?: "default" | "muted";
};

export function Text({ children, variant = "body", tone = "default" }: TextProps) {
  return <p className={styles.text} data-variant={variant} data-tone={tone}>{children}</p>;
}
