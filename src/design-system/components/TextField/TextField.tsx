import { useId, type ComponentProps } from "react";
import styles from "../fields.module.css";

type TextFieldProps = Omit<ComponentProps<"input">, "className"> & {
  label: string;
  error?: string;
};

export function TextField({
  label, error, id, "aria-describedby": describedBy, "aria-invalid": invalid, ...props
}: TextFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const errorId = error ? `${fieldId}-error` : undefined;

  return (
    <div className={styles.field}>
      <label htmlFor={fieldId}>{label}</label>
      <input
        {...props}
        id={fieldId}
        className={styles.control}
        aria-invalid={error ? true : invalid}
        aria-describedby={[describedBy, errorId].filter(Boolean).join(" ") || undefined}
      />
      {error && <div id={errorId} className={styles.error}>{error}</div>}
    </div>
  );
}
