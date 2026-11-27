"use client";

import { useState } from "react";
import { Button } from "@/design-system/components/Button";
import { IconButton } from "@/design-system/components/IconButton";
import { Swatch } from "@/design-system/components/Swatch";
import { Notice } from "@/design-system/components/Notice";
import { TextArea } from "@/design-system/components/TextArea";
import { Text } from "@/design-system/components/Text";
import { messages } from "@/lib/messages/pt-br";
import type { Annotation } from "@/lib/sync/annotations";
import { AnnotationColors } from "./AnnotationColors";
import styles from "./annotations.module.css";

export type AnnotationSelection = { cfi: string; quote: string; sample?: string };

export function AnnotationPanel({ annotation, noteOnly, cancel, onSave }: {
  annotation: Annotation;
  noteOnly: boolean;
  cancel: () => void;
  onSave: (row: Annotation) => Promise<boolean>;
}) {
  const [color, setColor] = useState(annotation.color);
  const [note, setNote] = useState(annotation.note ?? "");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const { annotations } = messages;
  const label = noteOnly ? annotations.addNote : annotations.edit;

  async function submit(deleted = false) {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    const saved = await onSave({
      ...annotation, color, note: note.trim() || null, deleted_at: deleted ? new Date().toISOString() : null,
    });
    if (saved) cancel();
    else {
      setBusy(false);
      setFailed(true);
    }
  }

  return (
    <section className={styles.panel} aria-label={label}>
      <Text>{annotation.quote_text}</Text>
      <Text tone="muted">{annotations.shared}</Text>
      {noteOnly ? <div className={styles.selectedColor}>
        <Swatch tone={color} />
        <Text>{annotations.colors[color]}</Text>
      </div> : <AnnotationColors color={color} disabled={busy} onSelect={setColor} />}
      <TextArea label={annotations.note} value={note} onChange={event => setNote(event.target.value)} maxLength={4000} />
      {failed && <Notice live="alert">{annotations.saveFailed}</Notice>}
      <div className={styles.actions}>
        <Button loading={busy} onClick={() => void submit()}>{noteOnly ? annotations.saveNote : annotations.save}</Button>
        {!noteOnly && <IconButton icon="trash" label={annotations.remove} disabled={busy} onClick={() => void submit(true)} />}
        <Button variant="quiet" disabled={busy} onClick={cancel}>{annotations.cancel}</Button>
      </div>
    </section>
  );
}
