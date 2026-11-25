"use client";

import { Button } from "@/design-system/components/Button";
import { Text } from "@/design-system/components/Text";
import { messages } from "@/lib/messages/pt-br";
import type { Annotation } from "@/lib/sync/annotations";
import styles from "./annotations.module.css";

type Chapter = { index: number; label: string };
type Props = {
  rows: Annotation[];
  userId: string;
  chapters: Record<string, Chapter>;
  currentChapter?: number;
  onGo: (row: Annotation) => void;
  onEdit: (row: Annotation) => void;
};

export function AnnotationList({ rows, userId, chapters, currentChapter, onGo, onEdit }: Props) {
  const { annotations } = messages;
  const groups = new Map<number, Annotation[]>();
  for (const row of rows) {
    const chapter = chapters[row.id]?.index ?? -1;
    const group = groups.get(chapter);
    if (group) group.push(row);
    else groups.set(chapter, [row]);
  }
  return (
    <section className={styles.panel}>
      <details>
        <summary>{annotations.list} ({rows.length})</summary>
        {rows.length === 0 && <Text>{annotations.empty}</Text>}
        {[...groups.entries()].sort(([a], [b]) => a - b).map(([index, list]) => (
          <details key={index} open={index === currentChapter || undefined}>
            <summary>{chapters[list[0].id]?.label || annotations.unknownChapter} ({list.length})</summary>
            <ul className={styles.list}>
              {list.map(row => (
                <li key={row.id} className={styles.panel}>
                  <Button variant="quiet" onClick={() => onGo(row)}>{row.quote_text}</Button>
                  {row.note && <Text>{row.note}</Text>}
                  {row.author_id === userId && <Button variant="secondary" onClick={() => onEdit(row)}>{annotations.edit}</Button>}
                </li>
              ))}
            </ul>
          </details>
        ))}
      </details>
    </section>
  );
}
