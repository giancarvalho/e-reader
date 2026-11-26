"use client";

import { useMemo, useRef, useState } from "react";
import { AnnotationColors, AnnotationList, AnnotationPanel, useAnnotations, type AnnotationSelection } from "@/features/annotations";
import { DictionaryPanel } from "@/features/dictionary";
import { CommentThread, useComments } from "@/features/comments";
import { Button } from "@/design-system/components/Button";
import { Sheet } from "@/design-system/components/Sheet";
import { Text } from "@/design-system/components/Text";
import { detectDictionaryLanguage, dictionaryWord, type DictionaryLanguage } from "@/lib/dictionary/lookup";
import type { ReaderIdentity } from "@/lib/books/local";
import type { ReaderPreferences, ReadingPosition } from "@/lib/reader/model";
import type { Annotation, AnnotationColor } from "@/lib/sync/annotations";
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
  const { rows, save } = useAnnotations(identity);
  const comments = useComments(identity);
  const [selectionReset, resetSelection] = useState(0);
  const [anchor, setAnchor] = useState<() => { x: number; top: number; bottom: number } | undefined>();
  const [change, setChange] = useState<{ row: Annotation; previous?: Annotation }>();
  const savingColor = useRef(false);
  const [quickBusy, setQuickBusy] = useState(false);
  const [colorFailed, setColorFailed] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [lookup, setLookup] = useState<{ word: string; language: DictionaryLanguage }>();
  const [threadId, openThread] = useState<string>();
  const thread = rows.find(row => row.id === threadId);
  const counts = useMemo(() => {
    const result = new Map<string, number>();
    for (const row of comments.rows) if (!row.deleted_at) result.set(row.annotation_id, (result.get(row.annotation_id) ?? 0) + 1);
    return result;
  }, [comments.rows]);
  const [selection, setSelection] = useState<AnnotationSelection>();
  const activeChange = change?.row.cfi === selection?.cfi ? change : undefined;
  const selectedHighlight = activeChange?.row ?? rows.find(row => row.cfi === selection?.cfi && row.author_id === identity.user);
  const definable = Boolean(selection && dictionaryWord(selection.quote));
  const [editing, setEditing] = useState<{ annotation: Annotation; noteOnly: boolean }>();
  const [target, setTarget] = useState<{ cfi: string }>();
  const [chapters, setChapters] = useState<Record<string, Chapter>>({});
  const [currentChapter, setCurrentChapter] = useState<number>();
  const { annotations } = messages;

  function cancel() {
    setSelection(undefined);
    setLookup(undefined);
    setEditing(undefined);
    setColorFailed(false);
    resetSelection(value => value + 1);
  }

  function select(value: AnnotationSelection) {
    setChange(undefined);
    setColorFailed(false);
    setLookup(undefined);
    setSelection(value);
  }

  function define() {
    const word = selection && dictionaryWord(selection.quote);
    if (!selection || !word) return;
    setLookup({ word, language: detectDictionaryLanguage(language, selection.sample) });
    setSelection(undefined);
  }

  function edit(annotation: Annotation, noteOnly = false) {
    cancel();
    setChange(undefined);
    setEditing({ annotation, noteOnly });
  }

  async function selectColor(color: AnnotationColor) {
    if (!selection || savingColor.current || color === selectedHighlight?.color) return;
    savingColor.current = true;
    setQuickBusy(true);
    setColorFailed(false);
    const row: Annotation = selectedHighlight ? { ...selectedHighlight, color } : {
      id: crypto.randomUUID(), group_id: identity.group, book_id: identity.hash, author_id: identity.user,
      cfi: selection.cfi, quote_text: selection.quote, color, note: null, deleted_at: null,
    };
    try {
      const saved = await save(row);
      if (saved) setChange({ row, previous: activeChange ? activeChange.previous : selectedHighlight });
      else setColorFailed(true);
    } finally {
      savingColor.current = false;
      setQuickBusy(false);
    }
  }

  async function undo() {
    if (!change || savingColor.current) return;
    savingColor.current = true;
    setQuickBusy(true);
    setColorFailed(false);
    try {
      if (await save(change.previous ?? { ...change.row, deleted_at: new Date().toISOString() })) setChange(undefined);
      else setColorFailed(true);
    } finally {
      savingColor.current = false;
      setQuickBusy(false);
    }
  }

  return (
    <>
      <ReaderCanvas title={title} annotationCount={rows.length} onOpenAnnotations={() => setListOpen(true)} file={file} initialCfi={cfi} preferences={preferences}
        onPosition={onPosition} onPreferences={onPreferences}
        annotations={rows} commentCounts={counts} annotationTarget={target} onChapter={setCurrentChapter} onChapters={setChapters}
        selectionReset={selectionReset}
        onSelection={select}
        onAnnotation={(id, position) => { setAnchor(() => position); openThread(id); }}
        onDismissAnnotation={() => {
          if (!threadId) return false;
          openThread(undefined);
          return true;
        }}
      >
        {selection && <div className={styles.selectionMenu} role="group" aria-label={annotations.selection}>
          <AnnotationColors color={selectedHighlight?.color} disabled={quickBusy} onSelect={color => void selectColor(color)} />
          <Button variant="quiet" disabled={!selectedHighlight || quickBusy}
            onClick={() => { if (selectedHighlight) edit(selectedHighlight, true); }}>{annotations.addNote}</Button>
          {definable && <Button variant="quiet" disabled={quickBusy} onClick={define}>{annotations.define}</Button>}
          {activeChange && <Button variant="quiet" disabled={quickBusy} onClick={() => void undo()}>{annotations.undo}</Button>}
          <Button variant="icon" onClick={cancel} aria-label={annotations.cancel}>×</Button>
          {colorFailed && <div role="alert"><Text>{annotations.saveFailed}</Text></div>}
        </div>}
        {editing && <Sheet title={editing.noteOnly ? annotations.addNote : annotations.edit}
          closeLabel={messages.reader.closePanel} onClose={cancel}>
          <AnnotationPanel key={editing.annotation.id} annotation={editing.annotation} noteOnly={editing.noteOnly}
            cancel={cancel} onSave={save} />
        </Sheet>}
        {change && !selection && !editing && !lookup && <div className={styles.savedNotice} role="status">
          <Text>{colorFailed ? annotations.saveFailed : annotations.saved}</Text>
          <Button variant="quiet" disabled={quickBusy} onClick={() => void undo()}>{annotations.undo}</Button>
          <Button variant="icon" onClick={() => setChange(undefined)} aria-label={messages.reader.closePanel}>×</Button>
        </div>}
        {lookup && <DictionaryPanel key={lookup.word} word={lookup.word} language={lookup.language}
          close={cancel} />}
        {listOpen && <Sheet variant="compact" title={annotations.list} closeLabel={messages.reader.closePanel} onClose={() => setListOpen(false)}>
          <AnnotationList rows={rows} userId={identity.user} chapters={chapters} currentChapter={currentChapter}
          onGo={row => { setListOpen(false); setTarget({ cfi: row.cfi }); }} onEdit={row => { setListOpen(false); edit(row); }}
          commentCounts={counts} onThread={row => { setListOpen(false); setAnchor(undefined); openThread(row.id); }} />
        </Sheet>}
        {thread && <CommentThread key={thread.id} identity={identity} annotation={thread} rows={comments.rows}
          save={comments.save} anchor={anchor}
          edit={thread.author_id === identity.user ? () => { openThread(undefined); edit(thread); } : undefined} close={() => openThread(undefined)} />}
      </ReaderCanvas>
    </>
  );
}
