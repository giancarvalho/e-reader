"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Avatar } from "@/design-system/components/Avatar";
import { Button } from "@/design-system/components/Button";
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
  anchor?: { x: number; top: number; bottom: number };
  edit?: () => void;
};

export function CommentThread({ identity, annotation, rows, status, save, retry, close, anchor, edit }: Props) {
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const { comments } = messages;
  const panel = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    const node = panel.current;
    if (!node) return;
    function place() {
      if (!node) return;
      const viewport = window.visualViewport;
      const left = viewport?.offsetLeft ?? 0, top = viewport?.offsetTop ?? 0;
      const width = viewport?.width ?? window.innerWidth, height = viewport?.height ?? window.innerHeight;
      const inset = 12;
      node.style.maxHeight = Math.max(0, height - 2 * inset) + "px";
      const box = node.getBoundingClientRect();
      node.style.left = Math.max(left + inset, Math.min((anchor?.x ?? left + width / 2) - box.width / 2, left + width - box.width - inset)) + "px";
      const below = (anchor?.bottom ?? top + height) + inset;
      const above = (anchor?.top ?? top + height) - box.height - inset;
      node.style.top = Math.max(top + inset, Math.min(below + box.height <= top + height ? below : above, top + height - box.height - inset)) + "px";
    }
    place();
    const observer = new ResizeObserver(place);
    observer.observe(node);
    window.visualViewport?.addEventListener("resize", place);
    window.visualViewport?.addEventListener("scroll", place);
    window.addEventListener("resize", place);
    return () => { observer.disconnect(); window.visualViewport?.removeEventListener("resize", place); window.visualViewport?.removeEventListener("scroll", place); window.removeEventListener("resize", place); };
  }, [anchor]);
  useEffect(() => {
    function outside(event: PointerEvent) { if (!panel.current?.contains(event.target as Node)) close(); }
    function key(event: KeyboardEvent) { if (event.key === "Escape") close(); }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", key); };
  }, [close]);
  const thread = rows.filter(row => row.annotation_id === annotation.id && !row.deleted_at)
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));


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
    <div ref={panel} className={styles.bubble} role="dialog" aria-label={comments.thread}>
      <div className={styles.thread}>
        <div className={styles.toolbar}>
          {edit && <Button variant="icon" aria-label={messages.annotations.edit} aria-expanded={menu} onClick={() => setMenu(value => !value)}>⋯</Button>}
          <Button variant="icon" aria-label={comments.close} onClick={close}>×</Button>
        </div>
        {menu && edit && <Button variant="quiet" onClick={edit}>{messages.annotations.edit}</Button>}
        {annotation.note && <Text tone="muted">{annotation.note}</Text>}
        <div className={styles.replies}>
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
        </div>
        {status !== "idle" && <div role="status">
          <Text>{comments[status]}</Text>
          {status === "error" && <Button variant="quiet" onClick={() => void retry()}>{messages.annotations.retry}</Button>}
        </div>}
        <form className={styles.panel} onSubmit={submit}>
          <TextArea label={comments.reply} value={reply} onChange={event => setReply(event.target.value)} maxLength={4000} required />
          <Button type="submit" loading={busy} disabled={!reply.trim()}>{comments.send}</Button>
        </form>
      </div>
    </div>
  );
}
