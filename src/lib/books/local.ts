import { openDB, type DBSchema } from "idb";
import { sha256 } from "../epub/inspect";

export type ShelfBook = {
  id: string;
  group_id: string;
  title: string;
  author: string | null;
  language: string | null;
  cover_path: string | null;
  position: number;
  is_current: boolean;
};

export type ShelfSnapshot = { userId: string; books: ShelfBook[] };

type LocalBook = {
  userId: string;
  groupId: string;
  hash: string;
  file: Blob | ArrayBuffer;
  cover: Blob | ArrayBuffer | null;
  coverType?: string;
};

export type ReadingPosition = { cfi: string; fraction: number };

interface LibraryDb extends DBSchema {
  positions: { key: [string, string, string]; value: ReadingPosition };
  shelf: { key: "active"; value: ShelfSnapshot };
  files: { key: [string, string, string]; value: LocalBook };
}

function openLibrary() {
  return openDB<LibraryDb>("e-reader-library", 2, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore("shelf");
        db.createObjectStore("files", { keyPath: ["userId", "groupId", "hash"] });
      }
      if (oldVersion < 2) db.createObjectStore("positions");
    },
    blocking(_currentVersion, _newVersion, event) {
      (event.target as IDBDatabase).close();
    },
  });
}

async function withLibrary<Result>(
  run: (db: Awaited<ReturnType<typeof openLibrary>>) => Promise<Result>,
) {
  const library = await openLibrary();
  try {
    return await run(library);
  } finally {
    library.close();
  }
}

export function readLocalShelf() {
  return withLibrary(db => db.get("shelf", "active"));
}

export function saveLocalShelf(snapshot: ShelfSnapshot) {
  return withLibrary(db => db.put("shelf", snapshot, "active"));
}

export function clearLocalShelf() {
  return withLibrary(db => db.delete("shelf", "active"));
}

export function readLocalBook(userId: string, book: ShelfBook) {
  return withLibrary(async db => {
    const entry = await db.get("files", [userId, book.group_id, book.id]);
    if (!entry) return undefined;
    return {
      file: entry.file instanceof Blob ? entry.file : new Blob([entry.file], { type: "application/epub+zip" }),
      cover: entry.cover instanceof Blob || entry.cover === null
        ? entry.cover
        : new Blob([entry.cover], { type: entry.coverType }),
    };
  });
}

export async function saveLocalBook(userId: string, book: ShelfBook, file: Blob, cover: Blob | null) {
  const bytes = await file.arrayBuffer();
  if (await sha256(bytes) !== book.id) throw new Error("EPUB checksum mismatch");
  const coverBytes = cover ? await cover.arrayBuffer() : null;
  await withLibrary(db => db.put("files", {
    userId, groupId: book.group_id, hash: book.id, file: bytes, cover: coverBytes, coverType: cover?.type,
  }));
}

export function readReadingPosition(userId: string, book: ShelfBook) {
  return withLibrary(db => db.get("positions", [userId, book.group_id, book.id]));
}

export function saveReadingPosition(userId: string, book: ShelfBook, position: ReadingPosition) {
  return withLibrary(db => db.put("positions", position, [userId, book.group_id, book.id]));
}
