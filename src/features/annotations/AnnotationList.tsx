"use client";

import { useState } from "react";
import { Button } from "@/design-system/components/Button";
import { Disclosure } from "@/design-system/components/Disclosure";
import { Icon } from "@/design-system/components/Icon";
import { IconButton } from "@/design-system/components/IconButton";
import { List, ListItem } from "@/design-system/components/List";
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
  commentCounts: ReadonlyMap<string, number>;
  onThread: (row: Annotation) => void;
};

export function AnnotationList({ rows, userId, chapters, currentChapter, onGo, onEdit, commentCounts, onThread }: Props) {
  const { annotations } = messages;
  const [menu, setMenu] = useState<string>();
  const [mine, setMine] = useState(false);
  const groups = new Map<number, Annotation[]>();
  for (const row of rows) {
    if (mine && row.author_id !== userId) continue;
    const chapter = chapters[row.id]?.index ?? -1;
    const group = groups.get(chapter);
    if (group) group.push(row);
    else groups.set(chapter, [row]);
  }
  return (
    <section className={styles.panel}>
      <div className={styles.filters} role="group" aria-label={annotations.filter}>
        <Button variant="quiet" aria-pressed={!mine} onClick={() => setMine(false)}>{annotations.group}</Button>
        <Button variant="quiet" aria-pressed={mine} onClick={() => setMine(true)}>{annotations.mine}</Button>
      </div>
        {groups.size === 0 && <Text>{annotations.empty}</Text>}
        {[...groups.entries()].sort(([a], [b]) => a === currentChapter ? -1 : b === currentChapter ? 1 : a - b).map(([index, list]) => (
          <Disclosure key={index} open={index === currentChapter || groups.size === 1 || undefined}
            summary={`${chapters[list[0].id]?.label || annotations.unknownChapter} (${list.length})`}>
            <List>
              {list.map(row => {
                const count = commentCounts.get(row.id) ?? 0;
                return (
                  <ListItem key={row.id} divided>
                    <div className={styles.item}>
                    <div className={styles.itemText}>
                      <Button variant="quiet" onClick={() => onGo(row)}>{row.quote_text}</Button>
                      {row.note && <Text tone="muted">{row.note}</Text>}
                    </div>
                    <div className={styles.itemActions}>
                      <Button variant="icon" aria-label={count ? `${messages.comments.label} (${count})` : messages.comments.thread}
                        onClick={() => onThread(row)}>
                        <Icon name="conversation" />{count > 0 && <span aria-hidden="true">{count}</span>}
                      </Button>
                      {row.author_id === userId && <IconButton icon="more" label={messages.comments.options}
                        aria-expanded={menu === row.id} onClick={() => setMenu(menu === row.id ? undefined : row.id)} />}
                    </div>
                    {menu === row.id && row.author_id === userId &&
                      <div className={styles.itemMenu}><Button variant="quiet" onClick={() => onEdit(row)}>{annotations.edit}</Button></div>}
                    </div>
                  </ListItem>
                );
              })}
            </List>
          </Disclosure>
        ))}
    </section>
  );
}
