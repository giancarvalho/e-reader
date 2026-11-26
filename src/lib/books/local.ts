import { openDB, type DBSchema } from "idb";
import { sha256 } from "../epub/inspect";
import { reconcileRecord, type ReaderPreferences, type ReaderRecord, type ReaderState, type ReadingPosition } from "../reader/model";

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

interface LibraryDb extends DBSchema {
  positions: { key: [string, string, string]; value: ReadingPosition | ReaderRecord<ReadingPosition> };
  readerPreferences: { key: string; value: ReaderRecord<ReaderPreferences> };
  lastOpened: { key: string; value: ReaderIdentity };
  shelf: { key: "active"; value: ShelfSnapshot };
  files: { key: [string, string, string]; value: LocalBook };
}

function openLibrary() {
  return openDB<LibraryDb>("e-reader-library", 4, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore("shelf");
        db.createObjectStore("files", { keyPath: ["userId", "groupId", "hash"] });
      }
      if (oldVersion < 2) db.createObjectStore("positions");
      if (oldVersion < 3) db.createObjectStore("readerPreferences");
      if (oldVersion < 4) db.createObjectStore("lastOpened");
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

export type ReaderIdentity = { user: string; group: string; hash: string };

export function rememberOpenedBook(identity: ReaderIdentity) {
  return withLibrary(db => db.put("lastOpened", identity, identity.user));
}

export function readLastOpenedBook(user: string) {
  return withLibrary(db => db.get("lastOpened", user));
}

function positionKey({ user, group, hash }: ReaderIdentity): [string, string, string] {
  return [user, group, hash];
}

function positionRecord(record: ReadingPosition | ReaderRecord<ReadingPosition> | undefined) {
  if (!record || "value" in record) return record;
  return { value: record, pending: "legacy", updatedAt: null };
}

export function readReaderState(identity: ReaderIdentity): Promise<ReaderState> {
  return withLibrary(async db => {
    const tx = db.transaction(["positions", "readerPreferences"]);
    const [position, preferences] = await Promise.all([
      tx.objectStore("positions").get(positionKey(identity)),
      tx.objectStore("readerPreferences").get(identity.user),
      tx.done,
    ]);
    return { position: positionRecord(position), preferences };
  });
}

function pending<T>(value: T): ReaderRecord<T> {
  return { value, pending: crypto.randomUUID(), updatedAt: null };
}

export function saveReadingPosition(identity: ReaderIdentity, position: ReadingPosition) {
  return withLibrary(db => db.put("positions", pending(position), positionKey(identity)));
}

export function saveReaderPreferences(user: string, preferences: ReaderPreferences) {
  return withLibrary(db => db.put("readerPreferences", pending(preferences), user));
}

export function applyReaderSync(identity: ReaderIdentity, sent: ReaderState, reply: ReaderState): Promise<ReaderState> {
  return withLibrary(async db => {
    const tx = db.transaction(["positions", "readerPreferences"], "readwrite");
    const positions = tx.objectStore("positions");
    const preferences = tx.objectStore("readerPreferences");
    const key = positionKey(identity);
    const currentPosition = positionRecord(await positions.get(key));
    const currentPreferences = await preferences.get(identity.user);
    const position = reconcileRecord(currentPosition, sent.position, reply.position);
    const preference = reconcileRecord(currentPreferences, sent.preferences, reply.preferences);
    if (position && position !== currentPosition) await positions.put(position, key);
    if (preference && preference !== currentPreferences) await preferences.put(preference, identity.user);
    await tx.done;
    return { position, preferences: preference };
  });
}
