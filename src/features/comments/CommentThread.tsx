"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import { getNoteAuthor } from "@/features/annotations";
import { Avatar } from "@/design-system/components/Avatar";
import { Button } from "@/design-system/components/Button";
import { IconButton } from "@/design-system/components/IconButton";
import { Popover } from "@/design-system/components/Popover";
import { List, ListItem } from "@/design-system/components/List";
import { Notice } from "@/design-system/components/Notice";
import { Text } from "@/design-system/components/Text";
import { TextArea } from "@/design-system/components/TextArea";
import type { ReaderIdentity } from "@/lib/books/local";
import { isOnline, onReconnect } from "@/lib/online";
import { messages } from "@/lib/messages/pt-br";
import type { Annotation } from "@/lib/sync/annotations";
import type { Comment } from "./types";
import styles from "./comments.module.css";

type Props = {
  identity: ReaderIdentity;
  annotation: Annotation;
  rows: Comment[];
  save: (row: Comment) => Promise<boolean>;
  close: () => void;
  anchor?: () => { x: number; top: number; bottom: number } | undefined;
  edit?: () => void;
};

export function CommentThread({ identity, annotation, rows, save, close, anchor, edit }: Props) {
  const [author, setAuthor] = useState<{ name?: string | null; avatar?: string | null }>();
  const [composing, setComposing] = useState(false);
  const [failed, setFailed] = useState(false);
  const replyField = useRef<HTMLTextAreaElement>(null);
  const replyButton = useRef<HTMLButtonElement>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const { comments } = messages;
  const [menu, setMenu] = useState(false);
  const thread = rows.filter(row => row.annotation_id === annotation.id && !row.deleted_at)
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));


  useEffect(() => {
    // Your own highlights always read "Você", so there is nothing to look up.
    if (annotation.name !== undefined || annotation.author_id === identity.user) return;
    let active = true;
    function lookup() {
      if (!isOnline()) return;
      void getNoteAuthor(identity, annotation.id).then(profile => {
        if (profile && active) setAuthor(profile);
      }).catch(() => undefined);
    }
    lookup();
    const stopReconnect = onReconnect(lookup);
    return () => {
      active = false;
      stopReconnect();
    };
  }, [annotation.id, annotation.name, annotation.author_id, identity]);

  const noteAuthor = annotation.author_id === identity.user ? comments.you : annotation.name || author?.name || comments.member;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = reply.trim();
    if (!text || busy) return;
    setBusy(true);
    setFailed(false);
    const stored = await save({
      id: crypto.randomUUID(), annotation_id: annotation.id,
      group_id: identity.group, book_id: identity.hash, author_id: identity.user,
      text, created_at: new Date().toISOString(), deleted_at: null,
    });
    if (stored) {
      setReply("");
      setComposing(false);
      replyButton.current?.focus({ preventScroll: true });
    } else setFailed(true);
    setBusy(false);
  }

  return (
    <Popover label={comments.thread} onClose={close} anchor={anchor}>
      <div className={styles.thread}>
        <div className={styles.header}>
          <div className={styles.author}>
            <Avatar src={annotation.avatar ?? author?.avatar} name={noteAuthor} />
            <div className={styles.authorText}>
              {!annotation.note && <Text tone="muted" variant="label">{comments.highlightedBy}</Text>}
              <Text>{noteAuthor}</Text>
            </div>
          </div>
          <div className={styles.toolbar}>
            <IconButton ref={replyButton} icon="reply" label={comments.replyAction} aria-expanded={composing}
              onClick={() => {
                if (composing) setComposing(false);
                else {
                  flushSync(() => setComposing(true));
                  replyField.current?.focus({ preventScroll: true });
                }
              }} />
            {edit && <IconButton icon="more" label={comments.options} aria-expanded={menu}
              onClick={() => setMenu(value => !value)} />}
            <IconButton icon="close" label={comments.close} onClick={close} />
          </div>
        </div>
        {menu && edit && <div className={styles.menu}><Button variant="quiet" onClick={edit}>{messages.annotations.edit}</Button></div>}
        {(annotation.note || thread.length > 0) && <div className={styles.replies}>
          {annotation.note && <Text>{annotation.note}</Text>}
          {thread.length > 0 && <List>
            {thread.map(row => {
              const own = row.author_id === identity.user;
              const name = own ? comments.you : row.name || comments.member;
              return (
                <ListItem key={row.id} divided>
                  <div className={styles.header}>
                    <div className={styles.author}><Avatar src={row.avatar} name={name} /><Text>{name}</Text></div>
                    {own && <IconButton icon="trash" label={comments.remove}
                      onClick={async () => setFailed(!await save({ ...row, deleted_at: new Date().toISOString() }))} />}
                  </div>
                  <Text>{row.text}</Text>
                </ListItem>
              );
            })}
          </List>}
        </div>}
        {failed && <Notice live="alert">{messages.annotations.saveFailed}</Notice>}
        {composing && <form className={styles.composer} onSubmit={submit}>
          <TextArea ref={replyField} label={comments.reply} hideLabel value={reply}
            placeholder={comments.reply} onChange={event => setReply(event.target.value)} maxLength={4000} rows={1} required />
          <IconButton icon="send" label={comments.send} type="submit" loading={busy} disabled={!reply.trim()} />
        </form>}
      </div>
    </Popover>
  );
}
