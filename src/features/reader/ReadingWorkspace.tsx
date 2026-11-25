"use client";

import { useState, type ReactNode } from "react";
import { AnnotationList, AnnotationPanel, useAnnotations, type AnnotationSelection } from "@/features/annotations";
import { Button } from "@/design-system/components/Button";
import { Text } from "@/design-system/components/Text";
import type { ReaderIdentity } from "@/lib/books/local";
import type { ReaderPreferences, ReadingPosition } from "@/lib/reader/model";
import type { Annotation } from "@/lib/sync/annotations";
import { messages } from "@/lib/messages/pt-br";
import { ReaderCanvas } from "./ReaderCanvas";

type Chapter = { index: number; label: string };

type Props = {
  identity: ReaderIdentity;
  file: Blob;
  cfi?: string;
  preferences: ReaderPreferences;
  onPosition: (position: ReadingPosition) => void;
  onPreferences: (preferences: ReaderPreferences) => void;
};

export function ReadingWorkspace({ identity, file, cfi, preferences, onPosition, onPreferences }: Props) {
  const { rows, status, save, retry } = useAnnotations(identity);
  const [selection, setSelection] = useState<AnnotationSelection>();
  const [editing, setEditing] = useState<Annotation>();
  const [target, setTarget] = useState<{ cfi: string }>();
  const [chapters, setChapters] = useState<Record<string, Chapter>>({});
  const [currentChapter, setCurrentChapter] = useState<number>();
  const { annotations } = messages;

  function cancel() {
    setSelection(undefined);
    setEditing(undefined);
  }

  function edit(row: Annotation) {
    setSelection(undefined);
    setEditing(row);
  }

  let announcement: ReactNode;
  if (status === "error") {
    announcement = <><Text>{annotations.syncError}</Text><Button variant="quiet" onClick={() => void retry()}>{annotations.retry}</Button></>;
  } else if (status === "offline" || status === "syncing") {
    announcement = <Text>{annotations[status]}</Text>;
  }

  return (
    <>
      <ReaderCanvas file={file} initialCfi={cfi} preferences={preferences}
        onPosition={onPosition} onPreferences={onPreferences}
        annotations={rows} annotationTarget={target} onChapter={setCurrentChapter} onChapters={setChapters}
        onSelection={value => { setEditing(undefined); setSelection(value); }}
        onAnnotation={id => {
          const row = rows.find(entry => entry.id === id);
          if (row?.author_id === identity.user) edit(row);
        }}
      >
        <div role="status">{announcement}</div>
        {(selection || editing) && <AnnotationPanel key={editing?.id ?? selection?.cfi}
          identity={identity} selection={selection} editing={editing} cancel={cancel} onSave={save} />}
        <AnnotationList rows={rows} userId={identity.user} chapters={chapters} currentChapter={currentChapter}
          onGo={row => setTarget({ cfi: row.cfi })} onEdit={edit} />
      </ReaderCanvas>
    </>
  );
}
