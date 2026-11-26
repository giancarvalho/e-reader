import { useId, type ComponentProps } from "react";
import styles from "../fields.module.css";

type TextAreaProps = Omit<ComponentProps<"textarea">, "className"> & {
  label: string;
  hideLabel?: boolean;
  error?: string;
};

export function TextArea({
  label, hideLabel, error, id, "aria-describedby": describedBy, "aria-invalid": invalid, ...props
}: TextAreaProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const errorId = error ? `${fieldId}-error` : undefined;

  return (
    <div className={styles.field}>
      <label className={hideLabel ? styles.visuallyHidden : undefined} htmlFor={fieldId}>{label}</label>
      <textarea
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
