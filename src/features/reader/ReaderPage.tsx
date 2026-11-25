"use client";

import { useCallback, useEffect, useState } from "react";
import { Heading } from "@/design-system/components/Heading";
import { Text } from "@/design-system/components/Text";
import {
  readLocalBook, readLocalShelf, readReadingPosition, saveReadingPosition,
  type ReadingPosition, type ShelfBook,
} from "@/lib/books/local";
import { messages } from "@/lib/messages/pt-br";
import { ReaderCanvas } from "./ReaderCanvas";
import styles from "./reader.module.css";

type Reading = { user: string; book: ShelfBook; file: Blob; cfi?: string };

export function ReaderPage() {
  const [reading, setReading] = useState<Reading | null>();
  const [failed, setFailed] = useState(false);
  const { reader } = messages;

  useEffect(() => {
    let active = true;
    async function load() {
      const activeShelf = await readLocalShelf();
      const book = activeShelf?.books.find(entry => entry.id === location.hash.slice(1));
      if (!activeShelf || !book) return null;
      const [asset, position] = await Promise.all([
        readLocalBook(activeShelf.userId, book),
        readReadingPosition(activeShelf.userId, book),
      ]);
      return asset ? { user: activeShelf.userId, book, file: asset.file, cfi: position?.cfi } : null;
    }
    void load().then(result => { if (active) setReading(result); }).catch(() => { if (active) setReading(null); });
    return () => { active = false; };
  }, []);

  const save = useCallback((position: ReadingPosition) => {
    if (reading) void saveReadingPosition(reading.user, reading.book, position).catch(() => setFailed(true));
  }, [reading]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        {/* Use a document navigation so the service worker can provide the offline shelf. */}
        <a href="/estante">{reader.shelf}</a>
        <Heading>{reading?.book.title ?? reader.title}</Heading>
      </header>
      {reading === undefined && <Text>{reader.loading}</Text>}
      {reading === null && <Text>{reader.missing}</Text>}
      {reading && <ReaderCanvas file={reading.file} initialCfi={reading.cfi} onPosition={save} />}
      {failed && <div role="status"><Text>{reader.progressFailed}</Text></div>}
    </main>
  );
}
