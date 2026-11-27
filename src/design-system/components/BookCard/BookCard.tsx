import type { ReactNode } from "react";
import { BookCover } from "../BookCover";
import { Heading } from "../Heading";
import { Text } from "../Text";
import styles from "./BookCard.module.css";

type BookCardProps = {
  title: string;
  author?: string | null;
  cover?: string;
  coverHref?: string;
  status?: string;
  /** The featured book of a list: the title uses the page heading instead of the section one. */
  featured?: boolean;
  children?: ReactNode;
};

export function BookCard({ title, author, cover, coverHref, status, featured = false, children }: BookCardProps) {
  const image = <BookCover src={cover} title={title} />;
  return (
    <article className={styles.card}>
      {coverHref ? <a className={styles.cover} href={coverHref} aria-label={title}>{image}</a> : image}
      <div className={styles.details}>
        <Heading as="h3" variant={featured ? "page" : "section"}>{title}</Heading>
        {author && <Text tone="muted">{author}</Text>}
        {status && <Text>{status}</Text>}
        {children}
      </div>
    </article>
  );
}
