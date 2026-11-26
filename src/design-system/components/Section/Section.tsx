import { useId, type ReactNode } from "react";
import { Heading } from "../Heading";
import styles from "./Section.module.css";

type SectionProps = {
  children: ReactNode;
  /** The section heading, rendered as an h2. Sections without a title are labelled by their content. */
  title?: string;
  /** `divided` is separated from what comes before by a rule; `outlined` is a bordered card. */
  variant?: "divided" | "outlined";
};

export function Section({ title, variant = "divided", children }: SectionProps) {
  const headingId = useId();
  return (
    <section className={styles.section} data-variant={variant} aria-labelledby={title ? headingId : undefined}>
      {title && <div id={headingId}><Heading as="h2" variant="section">{title}</Heading></div>}
      {children}
    </section>
  );
}
