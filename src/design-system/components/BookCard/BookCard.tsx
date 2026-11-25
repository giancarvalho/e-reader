import type { ReactNode } from "react";
import { BookCover } from "../BookCover";
import { Heading } from "../Heading";
import { Text } from "../Text";
import styles from "./BookCard.module.css";

type BookCardProps = {
  title: string;
  author?: string | null;
  cover?: string;
  status?: string;
  children?: ReactNode;
};

export function BookCard({ title, author, cover, status, children }: BookCardProps) {
  return (
    <article className={styles.card}>
      <BookCover src={cover} title={title} />
      <div className={styles.details}>
        <Heading as="h3">{title}</Heading>
        {author && <Text tone="muted">{author}</Text>}
        {status && <Text>{status}</Text>}
        {children}
      </div>
    </article>
  );
}
