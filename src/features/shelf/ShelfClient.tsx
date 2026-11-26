"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/design-system/components/Button";
import { BookCard } from "@/design-system/components/BookCard";
import { Notice } from "@/design-system/components/Notice";
import { Page } from "@/design-system/components/Page";
import { Link } from "@/design-system/components/Link";
import { LinkButton } from "@/design-system/components/LinkButton";
import { Sheet } from "@/design-system/components/Sheet";
import { Heading } from "@/design-system/components/Heading";
import { Text } from "@/design-system/components/Text";
import {
  readLocalBook, readLocalShelf, readLastOpenedBook, readReaderState, saveLocalBook, saveLocalShelf,
  type ReaderIdentity,
  type ShelfBook, type ShelfSnapshot,
} from "@/lib/books/local";
import { recordDiagnostic } from "@/lib/diagnostics";
import { maxEpubBytes } from "@/lib/epub/inspect";
import { messages } from "@/lib/messages/pt-br";
import { editShelf, getBookDownload } from "./actions";
import styles from "./shelf.module.css";
import { CopyInvite } from "./CopyInvite";
import { UploadBook } from "./UploadBook";

type ShelfProps = {
  snapshot: ShelfSnapshot;
  covers?: Record<string, string>;
  organizer?: boolean;
  offline?: boolean;
  groupName?: string;
  inviteCode?: string;
};

export function ShelfClient({ snapshot, covers, organizer = false, offline = false, groupName, inviteCode }: ShelfProps) {
  const [last, setLast] = useState<ReaderIdentity>();
  const [adding, setAdding] = useState(false);
  const [managing, setManaging] = useState(false);
  const { shelf, access } = messages;
  useEffect(() => {
    let active = true;
    if (!offline) void saveLocalShelf(snapshot).catch(() => undefined);
    void readLastOpenedBook(snapshot.userId).then(value => {
      if (active) setLast(value);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [offline, snapshot]);

  const recent = last?.user === snapshot.userId
    ? snapshot.books.find(book => book.id === last.hash && book.group_id === last.group)
    : undefined;
  const current = snapshot.books.find(book => book.is_current);
  const remaining = snapshot.books.filter(book => book !== current && book !== recent);
  const card = (book: ShelfBook, featured = false) => (
    <ShelfCard key={book.id} userId={snapshot.userId} book={book}
      remoteCover={covers?.[book.id]} offline={offline} resume={book === recent} featured={featured}>
      {managing && <ManageBook book={book} index={snapshot.books.indexOf(book)} total={snapshot.books.length} />}
    </ShelfCard>
  );

  return (
    <>
      <header className={styles.header}>
        <div>
          <Heading>{access.shelfTitle}</Heading>
          {groupName && <Text tone="muted">{groupName}</Text>}
          {offline && <Text tone="muted">{shelf.offline}</Text>}
        </div>
        {!offline && <Link href="/conta">{access.account}</Link>}
      </header>
      {organizer && <div className={styles.actions}>
        <Button variant="secondary" onClick={() => setAdding(true)}>{shelf.add}</Button>
        {inviteCode && <CopyInvite code={inviteCode} />}
        {snapshot.books.length > 0 && <Button variant="quiet" aria-pressed={managing} onClick={() => setManaging(value => !value)}>
          {managing ? shelf.finishManage : shelf.manage}
        </Button>}
      </div>}
      {adding && <Sheet title={shelf.add} closeLabel={messages.reader.closePanel} onClose={() => setAdding(false)}>
        <Text>{shelf.uploadLimit}</Text>
        <UploadBook />
      </Sheet>}
      {snapshot.books.length === 0 && <Text>{offline ? shelf.offlineEmpty : access.shelfEmpty}</Text>}
      {recent && <section className={styles.stack}>
        <Heading as="h2">{shelf.resume}</Heading>{card(recent, true)}
      </section>}
      {current && current !== recent && <section className={styles.stack}>
        <Heading as="h2">{shelf.current}</Heading>{card(current, !recent)}
      </section>}
      {remaining.length > 0 && <section className={styles.stack}>
        <Heading as="h2">{shelf.collection}</Heading>
        <div className={styles.books}>{remaining.map(book => card(book))}</div>
      </section>}
    </>
  );
}

function ShelfCard({ userId, book, remoteCover, offline, resume, featured, children }: {
  userId: string; book: ShelfBook; remoteCover?: string; offline: boolean; resume: boolean; featured: boolean; children?: ReactNode;
}) {
  const { shelf } = messages;
  const router = useRouter();
  const inFlight = useRef(false);
  const [stored, setStored] = useState<boolean>();
  const [progress, setProgress] = useState<number>();
  const readerHref = `/ler#${book.id}`;
  const action = resume ? shelf.resume : shelf.read;
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
    }).catch(() => { if (live) setStored(false); });
    void readReaderState({ user: userId, group: book.group_id, hash: book.id }).then(state => {
      if (live) setProgress(state.position?.value.fraction);
    }).catch(() => undefined);
    return () => {
      live = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [userId, book, downloadCount]);

  if (offline && !stored) return null;

  async function download(open: boolean) {
    if (inFlight.current) return;
    inFlight.current = true;
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
      void navigator.storage.persist?.().catch(() => false);
      if (open) router.push(readerHref);
    } catch {
      setNotice(shelf.downloadFailed);
      recordDiagnostic("download", "error");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <div className={featured ? styles.featured : styles.book}>
      <BookCard title={book.title} author={book.author} cover={cover ?? remoteCover}
        coverHref={stored ? readerHref : undefined} status={stored ? shelf.available : undefined}>
        {progress !== undefined && <div className={styles.progress}>
          <progress aria-label={shelf.progress} value={progress} max={1} />
          <span>{new Intl.NumberFormat("pt-BR", { style: "percent" }).format(progress)}</span>
        </div>}
        {!offline && stored === false && <>
          <Button loading={busy} onClick={() => download(true)}>{shelf.read}</Button>
          <Button variant="quiet" disabled={busy} onClick={() => download(false)}>{shelf.download}</Button>
        </>}
        {stored && <LinkButton href={readerHref}>{action}</LinkButton>}
        {(notice || busy) && <Notice>{busy ? shelf.downloading : notice}</Notice>}
        {children}
      </BookCard>
    </div>
  );
}

function ManageBook({ book, index, total }: { book: ShelfBook; index: number; total: number }) {
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
      {index > 0 && <Button variant="quiet" disabled={busy} onClick={() => edit("up")}>{shelf.moveUp}</Button>}
      {index < total - 1 && <Button variant="quiet" disabled={busy} onClick={() => edit("down")}>{shelf.moveDown}</Button>}
      {failed && <Text>{shelf.editFailed}</Text>}
    </div>
  );
}

export function OfflineShelf() {
  const [snapshot, setSnapshot] = useState<ShelfSnapshot | null>();
  useEffect(() => {
    let active = true;
    void readLocalShelf().then(async value => {
      if (!value) return null;
      const entries = await Promise.all(value.books.map(async book =>
        await readLocalBook(value.userId, book) ? book : null,
      ));
      return { ...value, books: entries.filter(book => book !== null) };
    }).then(value => { if (active) setSnapshot(value); }).catch(() => { if (active) setSnapshot(null); });
    return () => { active = false; };
  }, []);

  return (
    <Page>
      {snapshot === undefined
        ? <Notice>{messages.shelf.loading}</Notice>
        : <ShelfClient snapshot={snapshot ?? { userId: "", books: [] }} offline />}
    </Page>
  );
}
