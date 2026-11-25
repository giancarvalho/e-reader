"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Avatar } from "@/design-system/components/Avatar";
import { Button } from "@/design-system/components/Button";
import { Heading } from "@/design-system/components/Heading";
import { Text } from "@/design-system/components/Text";
import { TextArea } from "@/design-system/components/TextArea";
import type { ReaderIdentity } from "@/lib/books/local";
import { messages } from "@/lib/messages/pt-br";
import type { Annotation } from "@/lib/sync/annotations";
import type { Comment } from "./types";
import styles from "./comments.module.css";

type Props = {
  identity: ReaderIdentity;
  annotation: Annotation;
  rows: Comment[];
  status: "idle" | "offline" | "syncing" | "error";
  save: (row: Comment) => Promise<boolean>;
  retry: () => Promise<void>;
  close: () => void;
};

export function CommentThread({ identity, annotation, rows, status, save, retry, close }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const { comments } = messages;
  const thread = rows.filter(row => row.annotation_id === annotation.id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => { element?.close(); };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = reply.trim();
    if (!text || busy) return;
    setBusy(true);
    const stored = await save({
      id: crypto.randomUUID(), annotation_id: annotation.id,
      group_id: identity.group, book_id: identity.hash, author_id: identity.user,
      text, created_at: new Date().toISOString(), deleted_at: null,
    });
    if (stored) setReply("");
    setBusy(false);
  }

  return (
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={title} onCancel={event => {
      event.preventDefault();
      close();
    }}>
      <div className={styles.panel}>
        <div id={title}><Heading as="h2">{comments.thread}</Heading></div>
        <Text>{annotation.quote_text}</Text>
        {annotation.note && <Text tone="muted">{annotation.note}</Text>}
        {thread.length === 0 && <Text>{comments.empty}</Text>}
        <ul className={styles.list}>
          {thread.map(row => {
            const own = row.author_id === identity.user;
            const name = row.name || (own ? comments.you : comments.member);
            return (
              <li className={styles.panel} key={row.id}>
                <div className={styles.author}><Avatar src={row.avatar} name={name} /><Text>{name}</Text></div>
                <Text>{row.text}</Text>
                {own && <Button variant="quiet" onClick={() => void save({ ...row, deleted_at: new Date().toISOString() })}>
                  {comments.remove}
                </Button>}
              </li>
            );
          })}
        </ul>
        {status !== "idle" && <div role="status">
          <Text>{comments[status]}</Text>
          {status === "error" && <Button variant="quiet" onClick={() => void retry()}>{messages.annotations.retry}</Button>}
        </div>}
        <form className={styles.panel} onSubmit={submit}>
          <TextArea label={comments.reply} value={reply} onChange={event => setReply(event.target.value)} maxLength={4000} required />
          <Button type="submit" loading={busy} disabled={!reply.trim()}>{comments.send}</Button>
        </form>
        <Button variant="quiet" onClick={close}>{comments.close}</Button>
      </div>
    </dialog>
  );
}
