import { useId, type ComponentProps } from "react";
import styles from "./ColorField.module.css";

type ColorFieldProps = Omit<ComponentProps<"input">, "className" | "type"> & { label: string };

/** A labelled color picker. */
export function ColorField({ label, id, ...props }: ColorFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <div className={styles.field}>
      <label htmlFor={fieldId}>{label}</label>
      <input {...props} id={fieldId} type="color" className={styles.control} />
    </div>
  );
}
