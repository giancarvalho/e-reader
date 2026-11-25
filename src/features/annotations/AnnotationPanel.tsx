"use client";

import { useState } from "react";
import { Button } from "@/design-system/components/Button";
import { Heading } from "@/design-system/components/Heading";
import { TextArea } from "@/design-system/components/TextArea";
import { Text } from "@/design-system/components/Text";
import type { ReaderIdentity } from "@/lib/books/local";
import { messages } from "@/lib/messages/pt-br";
import type { Annotation, AnnotationColor } from "@/lib/sync/annotations";
import styles from "./annotations.module.css";

export type AnnotationSelection = { cfi: string; quote: string };

const colors: AnnotationColor[] = ["amber", "green", "blue", "pink"];

type Props = {
  identity: ReaderIdentity;
  selection?: AnnotationSelection;
  editing?: Annotation;
  cancel: () => void;
  onSave: (row: Annotation) => Promise<boolean>;
};

export function AnnotationPanel({ identity, selection, editing, cancel, onSave }: Props) {
  const [color, setColor] = useState<AnnotationColor>(editing?.color ?? "amber");
  const [note, setNote] = useState(editing?.note ?? "");
  const [busy, setBusy] = useState(false);
  const { annotations } = messages;
  const quote = editing?.quote_text ?? selection?.quote;
  const cfi = editing?.cfi ?? selection?.cfi;

  async function submit(deleted = false) {
    if (!quote || !cfi || busy) return;
    setBusy(true);
    const saved = await onSave({
      id: editing?.id ?? crypto.randomUUID(),
      group_id: identity.group, book_id: identity.hash, author_id: identity.user,
      cfi, quote_text: quote, color, note: note.trim() || null,
      deleted_at: deleted ? new Date().toISOString() : null,
    });
    setBusy(false);
    if (saved) cancel();
  }

  return (
    <section className={styles.panel} aria-label={editing ? annotations.edit : annotations.add}>
      <Heading as="h2">{editing ? annotations.edit : annotations.add}</Heading>
      <Text>{quote}</Text>
      <fieldset className={styles.colors}>
        <legend>{annotations.color}</legend>
        {colors.map(value => (
          <label key={value} className={styles.swatch} data-color={value}>
            <input type="radio" name="annotation-color" checked={color === value}
              onChange={() => setColor(value)} />
            {annotations.colors[value]}
          </label>
        ))}
      </fieldset>
      <TextArea label={annotations.note} value={note} onChange={event => setNote(event.target.value)} maxLength={4000} />
      <div className={styles.actions}>
        <Button loading={busy} onClick={() => void submit()}>{annotations.save}</Button>
        {editing && <Button variant="quiet" disabled={busy} onClick={() => void submit(true)}>{annotations.remove}</Button>}
        <Button variant="quiet" disabled={busy} onClick={cancel}>{annotations.cancel}</Button>
      </div>
    </section>
  );
}
