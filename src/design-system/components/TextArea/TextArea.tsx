import { useId, type ComponentProps } from "react";
import styles from "../fields.module.css";

type TextAreaProps = Omit<ComponentProps<"textarea">, "className"> & {
  label: string;
  error?: string;
};

export function TextArea({
  label, error, id, "aria-describedby": describedBy, "aria-invalid": invalid, ...props
}: TextAreaProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const errorId = error ? `${fieldId}-error` : undefined;

  return (
    <div className={styles.field}>
      <label htmlFor={fieldId}>{label}</label>
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
