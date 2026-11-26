"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Heading } from "@/design-system/components/Heading";
import { Text } from "@/design-system/components/Text";
import {
  applyReaderSync, readLocalBook, readLocalShelf, readReaderState, rememberOpenedBook,
  saveReaderPreferences, saveReadingPosition, type ReaderIdentity, type ShelfBook,
} from "@/lib/books/local";
import { recordDiagnostic } from "@/lib/diagnostics";
import { defaultPreferences, type ReaderPreferences, type ReadingPosition } from "@/lib/reader/model";
import { messages } from "@/lib/messages/pt-br";
import { ReadingWorkspace } from "./ReadingWorkspace";
import { syncReaderState } from "./sync";
import styles from "./reader.module.css";

type Reading = {
  identity: ReaderIdentity;
  book: ShelfBook;
  file: Blob;
  cfi?: string;
  preferences: ReaderPreferences;
};

export function ReaderPage() {
  const [reading, setReading] = useState<Reading | null>();
  const [failed, setFailed] = useState(false);
  const syncing = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const identity = reading?.identity;
  const { reader } = messages;

  useEffect(() => {
    let active = true;
    async function load() {
      const activeShelf = await readLocalShelf();
      const book = activeShelf?.books.find(entry => entry.id === location.hash.slice(1));
      if (!activeShelf || !book) return null;
      const user = activeShelf.userId;
      const identity = { user, group: book.group_id, hash: book.id };
      const [asset, state] = await Promise.all([readLocalBook(user, book), readReaderState(identity)]);
      if (asset) void rememberOpenedBook(identity).catch(() => undefined);
      return asset ? {
        identity, book, file: asset.file, cfi: state.position?.value.cfi,
        preferences: state.preferences?.value ?? defaultPreferences,
      } : null;
    }
    void load().then(result => { if (active) setReading(result); }).catch(() => { if (active) setReading(null); });
    return () => { active = false; };
  }, []);

  const sync = useCallback(async () => {
    if (!identity || !navigator.onLine || syncing.current) return;
    syncing.current = true;
    try {
      const sent = await readReaderState(identity);
      const reply = await syncReaderState(identity, {
        position: sent.position?.pending ? sent.position.value : undefined,
        preferences: sent.preferences?.pending ? sent.preferences.value : undefined,
      });
      if (!reply) {
        recordDiagnostic("reader", "error");
        return;
      }
      if ((sent.position?.pending && !reply.position) || (sent.preferences?.pending && !reply.preferences)) {
        recordDiagnostic("reader", "error");
      } else recordDiagnostic("reader", "ok");
      const received = await applyReaderSync(identity, sent, reply);
      setReading(current => {
        if (!current || current.identity !== identity) return current;
        const remotePosition = !sent.position?.pending && received.position?.pending === null
          && received.position.updatedAt !== sent.position?.updatedAt;
        const remotePreferences = !sent.preferences?.pending && received.preferences?.pending === null
          && received.preferences.updatedAt !== sent.preferences?.updatedAt;
        if (!remotePosition && !remotePreferences) return current;
        return {
          ...current,
          cfi: remotePosition ? received.position?.value.cfi : current.cfi,
          preferences: remotePreferences ? received.preferences?.value ?? current.preferences : current.preferences,
        };
      });
    } catch {
      if (navigator.onLine) recordDiagnostic("reader", "error");
    } finally {
      syncing.current = false;
    }
  }, [identity]);

  useEffect(() => {
    if (!identity) return;
    function syncWhenVisible() {
      if (document.visibilityState === "visible") void sync();
    }
    function syncNow() { void sync(); }
    syncNow();
    const interval = window.setInterval(syncWhenVisible, 10_000);
    window.addEventListener("online", syncNow);
    window.addEventListener("pagehide", syncNow);
    document.addEventListener("visibilitychange", syncNow);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timer.current);
      window.removeEventListener("online", syncNow);
      window.removeEventListener("pagehide", syncNow);
      document.removeEventListener("visibilitychange", syncNow);
    };
  }, [identity, sync]);

  const scheduleSync = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void sync(), 1_000);
  }, [sync]);

  const save = useCallback((position: ReadingPosition) => {
    if (identity) void saveReadingPosition(identity, position).then(scheduleSync).catch(() => setFailed(true));
  }, [identity, scheduleSync]);

  function changePreferences(value: ReaderPreferences) {
    if (!identity) return;
    setReading(current => current ? { ...current, preferences: value } : current);
    void saveReaderPreferences(identity.user, value).then(scheduleSync).catch(() => setFailed(true));
  }

  return (
    <main className={styles.page}>
      {!reading && <header className={styles.header}>
        {/* Use a document navigation so the service worker can provide the offline shelf. */}
        <a href="/estante">{reader.shelf}</a>
        <Heading>{reader.title}</Heading>
      </header>}
      {reading === null && <Text>{reader.missing}</Text>}
      {reading && <ReadingWorkspace title={reading.book.title}
        identity={reading.identity} language={reading.book.language} file={reading.file} cfi={reading.cfi} preferences={reading.preferences}
        onPosition={save} onPreferences={changePreferences}
      />}
      {failed && <div className={styles.progressError} role="status"><Text>{reader.progressFailed}</Text></div>}
    </main>
  );
}
