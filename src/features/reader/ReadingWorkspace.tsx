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
  const [selectionReset, resetSelection] = useState(0);
  const [noting, setNoting] = useState(false);
  const [highlight, setHighlight] = useState<Annotation>();
  const [lastSaved, setLastSaved] = useState<Annotation>();
  const [lastColor, setLastColor] = useState<Annotation["color"]>("amber");
  const [quickBusy, setQuickBusy] = useState(false);
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
    setNoting(false);
    setEditing(undefined);
    resetSelection(value => value + 1);
  }

  function edit(row: Annotation) {
    setSelection(undefined);
    setEditing(row);
  }

  async function store(row: Annotation) {
    const saved = await save(row);
    if (saved && !row.deleted_at) setLastColor(row.color);
    return saved;
  }

  async function quickHighlight() {
    if (!selection || quickBusy) return;
    setQuickBusy(true);
    const row: Annotation = {
      id: crypto.randomUUID(), group_id: identity.group, book_id: identity.hash, author_id: identity.user,
      cfi: selection.cfi, quote_text: selection.quote, color: lastColor, note: null, deleted_at: null,
    };
    try {
      if (await store(row)) {
        cancel();
        setLastSaved(row);
      }
    } finally {
      setQuickBusy(false);
    }
  }

  async function undo() {
    if (!lastSaved) return;
    if (await save({ ...lastSaved, deleted_at: new Date().toISOString() })) setLastSaved(undefined);
  }

  const define = word ? () => setLookup({ word, language: detectDictionaryLanguage(language, selection?.sample) }) : undefined;

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
        selectionReset={selectionReset}
        onSelection={value => {
          setEditing(undefined);
          setNoting(false);
          setLastSaved(undefined);
          setSelection(value);
        }}
        onAnnotation={id => setHighlight(rows.find(row => row.id === id))}
      >
        {selection && !noting && <div className={styles.selectionMenu} role="group" aria-label={annotations.selection}>
          <Button onClick={() => void quickHighlight()} loading={quickBusy}>{annotations.quick}</Button>
          {define && <Button variant="quiet" onClick={define}>{messages.dictionary.lookup}</Button>}
          <Button variant="quiet" onClick={() => setNoting(true)}>{annotations.addNote}</Button>
          <Button variant="icon" onClick={cancel} aria-label={annotations.cancel}>×</Button>
        </div>}
        {((selection && noting) || editing) && <Sheet title={editing ? annotations.edit : annotations.add}
          closeLabel={messages.reader.closePanel} onClose={cancel}>
          <AnnotationPanel key={editing?.id ?? selection?.cfi} identity={identity} selection={selection}
            editing={editing} preferredColor={lastColor} cancel={cancel} onSave={store} />
        </Sheet>}
        {lastSaved && !selection && !editing && <div className={styles.savedNotice} role="status">
          <Text>{annotations.saved}</Text>
          <Button variant="quiet" onClick={() => void undo()}>{annotations.undo}</Button>
          <Button variant="icon" onClick={() => setLastSaved(undefined)} aria-label={messages.reader.closePanel}>×</Button>
        </div>}
        {highlight && <Sheet title={annotations.summary} closeLabel={messages.reader.closePanel} onClose={() => setHighlight(undefined)}>
          <blockquote>{highlight.quote_text}</blockquote>
          {highlight.note && <Text>{highlight.note}</Text>}
          <Button variant="secondary" onClick={() => { openThread(highlight.id); setHighlight(undefined); }}>
            {messages.comments.label} ({counts.get(highlight.id) ?? 0})
          </Button>
          {highlight.author_id === identity.user && <Button variant="quiet" onClick={() => { edit(highlight); setHighlight(undefined); }}>
            {annotations.edit}
          </Button>}
        </Sheet>}
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
