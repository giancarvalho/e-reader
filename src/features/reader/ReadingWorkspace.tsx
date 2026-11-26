"use client";

import { useState, type ReactNode } from "react";
import { AnnotationList, AnnotationPanel, useAnnotations, type AnnotationSelection } from "@/features/annotations";
import { DictionaryPanel } from "@/features/dictionary";
import { CommentThread, useComments } from "@/features/comments";
import { Button } from "@/design-system/components/Button";
import { Sheet } from "@/design-system/components/Sheet";
import { Text } from "@/design-system/components/Text";
import { detectDictionaryLanguage, dictionaryWord, type DictionaryLanguage } from "@/lib/dictionary/lookup";
import type { ReaderIdentity } from "@/lib/books/local";
import type { ReaderPreferences, ReadingPosition } from "@/lib/reader/model";
import type { Annotation } from "@/lib/sync/annotations";
import { messages } from "@/lib/messages/pt-br";
import { ReaderCanvas } from "./ReaderCanvas";
import styles from "./reader.module.css";

type Chapter = { index: number; label: string };

type Props = {
  title: string;
  identity: ReaderIdentity;
  language: string | null;
  file: Blob;
  cfi?: string;
  preferences: ReaderPreferences;
  onPosition: (position: ReadingPosition) => void;
  onPreferences: (preferences: ReaderPreferences) => void;
};

export function ReadingWorkspace({ title, identity, language, file, cfi, preferences, onPosition, onPreferences }: Props) {
  const { rows, status, save, retry } = useAnnotations(identity);
  const comments = useComments(identity);
  const [listOpen, setListOpen] = useState(false);
  const [lookup, setLookup] = useState<{ word: string; language: DictionaryLanguage }>();
  const [threadId, openThread] = useState<string>();
  const thread = rows.find(row => row.id === threadId);
  const counts = new Map<string, number>();
  for (const row of comments.rows) counts.set(row.annotation_id, (counts.get(row.annotation_id) ?? 0) + 1);
  const [selection, setSelection] = useState<AnnotationSelection>();
  const word = selection ? dictionaryWord(selection.quote) : null;
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
      <ReaderCanvas title={title} annotationCount={rows.length} onOpenAnnotations={() => setListOpen(true)} file={file} initialCfi={cfi} preferences={preferences}
        onPosition={onPosition} onPreferences={onPreferences}
        annotations={rows} annotationTarget={target} onChapter={setCurrentChapter} onChapters={setChapters}
        onSelection={value => { setEditing(undefined); setSelection(value); }}
        onAnnotation={openThread}
      >
        {(selection || editing) && <div className={styles.selection}><AnnotationPanel key={editing?.id ?? selection?.cfi}
          identity={identity} selection={selection} editing={editing} cancel={cancel} onSave={save}
          onLookup={word ? () => setLookup({ word, language: detectDictionaryLanguage(language, selection?.sample) }) : undefined} /></div>}
        {lookup && <DictionaryPanel key={lookup.word} word={lookup.word} language={lookup.language}
          close={() => setLookup(undefined)} />}
        {listOpen && <Sheet title={annotations.list} closeLabel={messages.reader.closePanel} onClose={() => setListOpen(false)}>
          <div role="status">{announcement}</div>
          <AnnotationList rows={rows} userId={identity.user} chapters={chapters} currentChapter={currentChapter}
          onGo={row => { setListOpen(false); setTarget({ cfi: row.cfi }); }} onEdit={row => { setListOpen(false); edit(row); }}
          commentCounts={counts} onThread={row => openThread(row.id)} />
        </Sheet>}
        {thread && <CommentThread key={thread.id} identity={identity} annotation={thread} rows={comments.rows}
          status={comments.status} save={comments.save} retry={comments.retry} close={() => openThread(undefined)} />}
      </ReaderCanvas>
    </>
  );
}
