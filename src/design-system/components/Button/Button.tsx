import type { ComponentProps } from "react";
import styles from "./Button.module.css";

type ButtonVariant = "primary" | "secondary" | "quiet" | "icon" | "handle";
type ButtonProps = Omit<ComponentProps<"button">, "className" | "aria-label"> & {
  loading?: boolean;
} & (
  | { variant?: Exclude<ButtonVariant, "icon" | "handle">; "aria-label"?: string }
  | { variant: "icon" | "handle"; "aria-label": string }
);

export function Button({
  variant = "primary",
  loading = false,
  disabled = false,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={styles.button}
      data-variant={variant}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
    >
      {children}
    </button>
  );
}
