import styles from "./Swatch.module.css";

export type SwatchTone = "amber" | "green" | "blue" | "pink";

/** A decorative sample of a highlight color. The control that holds it names the color. */
export function Swatch({ tone, selected = false }: { tone: SwatchTone; selected?: boolean }) {
  return <span className={styles.swatch} data-tone={tone} data-selected={selected || undefined} aria-hidden="true" />;
}
