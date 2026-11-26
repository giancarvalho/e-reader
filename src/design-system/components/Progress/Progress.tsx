import type { ReactNode } from "react";
import { Text } from "../Text";
import styles from "./Progress.module.css";

type ProgressProps = {
  value: number;
  max?: number;
  /** The accessible name of the bar. */
  label: string;
  /** The value as shown next to the bar, for example "40%". */
  valueText?: ReactNode;
};

export function Progress({ value, max = 1, label, valueText }: ProgressProps) {
  return (
    <div className={styles.progress}>
      <progress className={styles.bar} aria-label={label} value={value} max={max} />
      {valueText !== undefined && <span className={styles.value}><Text tone="muted">{valueText}</Text></span>}
    </div>
  );
}
