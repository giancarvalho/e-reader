"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/design-system/components/Button";
import { BookCard } from "@/design-system/components/BookCard";
import { Heading } from "@/design-system/components/Heading";
import { Text } from "@/design-system/components/Text";
import {
  readLocalBook, readLocalShelf, saveLocalBook, saveLocalShelf,
  type ShelfBook, type ShelfSnapshot,
} from "@/lib/books/local";
import { recordDiagnostic } from "@/lib/diagnostics";
import { maxEpubBytes } from "@/lib/epub/inspect";
import { messages } from "@/lib/messages/pt-br";
import { editShelf, getBookDownload } from "./actions";
import styles from "./shelf.module.css";

type ShelfProps = {
  snapshot: ShelfSnapshot;
  covers?: Record<string, string>;
  organizer?: boolean;
  offline?: boolean;
};

export function ShelfClient({ snapshot, covers, organizer = false, offline = false }: ShelfProps) {
  useEffect(() => {
    if (!offline) void saveLocalShelf(snapshot).catch(() => undefined);
  }, [offline, snapshot]);

  const { shelf, access } = messages;
  const current = snapshot.books.find(book => book.is_current);
  const remaining = snapshot.books.filter(book => !book.is_current);
  const cards = (book: ShelfBook, orderable = false) => (
    <ShelfCard
      key={book.id}
      userId={snapshot.userId}
      book={book}
      remoteCover={covers?.[book.id]}
      offline={offline}
    >
      {organizer && <ManageBook book={book} reorder={orderable} />}
    </ShelfCard>
  );

  if (!snapshot.books.length) return <Text>{access.shelfEmpty}</Text>;

  return (
    <>
      {current && <section className={styles.stack}><Heading as="h2">{shelf.current}</Heading>{cards(current, true)}</section>}
      {remaining.length > 0 && <section className={styles.stack}>
        <Heading as="h2">{shelf.collection}</Heading>
        {remaining.map(book => cards(book, true))}
      </section>}
    </>
  );
}

function ShelfCard({ userId, book, remoteCover, offline, children }: {
  userId: string; book: ShelfBook; remoteCover?: string; offline: boolean; children?: ReactNode;
}) {
  const { shelf } = messages;
  const [stored, setStored] = useState(false);
  const [cover, setCover] = useState<string>();
  const [downloadCount, setDownloadCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let live = true;
    let objectUrl: string | undefined;
    void readLocalBook(userId, book).then(result => {
      if (!live) return;
      setStored(Boolean(result));
      if (result?.cover) objectUrl = URL.createObjectURL(result.cover);
      setCover(objectUrl);
    }).catch(() => undefined);
    return () => {
      live = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [userId, book, downloadCount]);

  if (offline && !stored) return null;

  async function download() {
    if (busy) return;
    setBusy(true);
    setNotice("");
    try {
      const urls = await getBookDownload(book.id);
      if (!urls || urls.userId !== userId) throw new Error("Download no longer authorized");

      const response = await fetch(urls.file, { cache: "no-store" });
      if (!response.ok) throw new Error("Download failed");
      const file = await response.blob();
      if (!file.size || file.size > maxEpubBytes) throw new Error("Invalid download size");

      let localCover = null;
      if (urls.cover) {
        const image = await fetch(urls.cover, { cache: "no-store" }).catch(() => null);
        if (image?.ok) localCover = await image.blob().catch(() => null);
      }

      await saveLocalBook(userId, book, file, localCover);
      setDownloadCount(count => count + 1);
      recordDiagnostic("download", "ok");
      await navigator.storage.persist?.().catch(() => false);
    } catch {
      setNotice(shelf.downloadFailed);
      recordDiagnostic("download", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <BookCard title={book.title} author={book.author} cover={cover ?? remoteCover}
      status={stored ? shelf.available : undefined}>
      {!offline && !stored && <Button loading={busy} onClick={download}>{shelf.download}</Button>}
      {stored && (
        // A document navigation uses the precached reader shell while offline.
        <a href={`/ler#${book.id}`}>{shelf.read}</a>
      )}
      {notice && <div role="status">{notice}</div>}
      {children}
    </BookCard>
  );
}

function ManageBook({ book, reorder }: { book: ShelfBook; reorder: boolean }) {
  const { shelf } = messages;
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function edit(action: "current" | "up" | "down") {
    if (busy) return;
    setBusy(true);
    try {
      setFailed(!await editShelf(book.id, action));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.actions}>
      {!book.is_current && <Button variant="quiet" disabled={busy} onClick={() => edit("current")}>{shelf.setCurrent}</Button>}
      {reorder && <Button variant="quiet" disabled={busy} onClick={() => edit("up")}>{shelf.moveUp}</Button>}
      {reorder && <Button variant="quiet" disabled={busy} onClick={() => edit("down")}>{shelf.moveDown}</Button>}
      {failed && <Text>{shelf.editFailed}</Text>}
    </div>
  );
}

export function OfflineShelf() {
  const [snapshot, setSnapshot] = useState<ShelfSnapshot | null>();
  const { shelf, access } = messages;
  useEffect(() => {
    void readLocalShelf().then(async value => {
      if (!value) return setSnapshot(null);
      const entries = await Promise.all(value.books.map(async book =>
        await readLocalBook(value.userId, book) ? book : null,
      ));
      setSnapshot({ ...value, books: entries.filter(book => book !== null) });
    }).catch(() => setSnapshot(null));
  }, []);

  return (
    <main className={styles.page}>
      <Heading>{access.shelfTitle}</Heading>
      <Text>{shelf.offline}</Text>
      <a href="/diagnostico">{messages.diagnostics.title}</a>
      {(snapshot === null || snapshot?.books.length === 0) && <Text>{shelf.offlineEmpty}</Text>}
      {snapshot && snapshot.books.length > 0 && <ShelfClient snapshot={snapshot} offline />}
    </main>
  );
}
