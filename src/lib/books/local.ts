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

type LocalBook = { userId: string; groupId: string; hash: string; file: Blob; cover: Blob | null };

interface LibraryDb extends DBSchema {
  shelf: { key: "active"; value: ShelfSnapshot };
  files: { key: [string, string, string]; value: LocalBook };
}

function openLibrary() {
  return openDB<LibraryDb>("e-reader-library", 1, {
    upgrade(db) {
      db.createObjectStore("shelf");
      db.createObjectStore("files", { keyPath: ["userId", "groupId", "hash"] });
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
  return withLibrary(db => db.get("files", [userId, book.group_id, book.id]));
}

export async function saveLocalBook(userId: string, book: ShelfBook, file: Blob, cover: Blob | null) {
  if (await sha256(await file.arrayBuffer()) !== book.id) throw new Error("EPUB checksum mismatch");
  await withLibrary(db => db.put("files", { userId, groupId: book.group_id, hash: book.id, file, cover }));
}
