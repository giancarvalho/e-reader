import type { ComponentProps } from "react";
import styles from "./LinkButton.module.css";

type LinkButtonProps = Omit<ComponentProps<"a">, "className" | "href"> & {
  href: string;
  variant?: "primary" | "secondary" | "quiet";
};

/** A link that looks and behaves like a Button, for actions that navigate. */
export function LinkButton({ variant = "primary", ...props }: LinkButtonProps) {
  return <a {...props} className={styles.link} data-variant={variant} />;
}
