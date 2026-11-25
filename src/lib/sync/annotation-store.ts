import { openDB, type DBSchema } from "idb";
import { compareCursor, type Annotation, type AnnotationCursor, type AnnotationQueue, type PendingAnnotation, type RemoteRow, type SyncRow } from "./annotations";

type Scope = [userId: string, groupId: string, bookId: string];
type Key = [...Scope, annotationId: string];

interface AnnotationDb<Row extends SyncRow> extends DBSchema {
  annotations: {
    key: Key;
    value: { scope: Scope; row: Row | RemoteRow<Row> };
    indexes: { byBook: Scope };
  };
  outbox: { key: Key; value: { scope: Scope; operation: PendingAnnotation<Row> }; indexes: { byBook: Scope } };
  cursors: { key: Scope; value: AnnotationCursor };
}

function openAnnotations<Row extends SyncRow>(name: string) {
  return openDB<AnnotationDb<Row>>(name, 1, {
    upgrade(db) {
      const annotations = db.createObjectStore("annotations");
      annotations.createIndex("byBook", "scope");
      const outbox = db.createObjectStore("outbox");
      outbox.createIndex("byBook", "scope");
      db.createObjectStore("cursors");
    },
    blocking(_currentVersion, _newVersion, event) {
      (event.target as IDBDatabase).close();
    },
  });
}

async function withAnnotations<Row extends SyncRow, T>(name: string, run: (db: Awaited<ReturnType<typeof openAnnotations<Row>>>) => Promise<T>) {
  const db = await openAnnotations<Row>(name);
  try {
    return await run(db);
  } finally {
    db.close();
  }
}

function isForBook(scope: Scope, row: SyncRow) {
  return row.group_id === scope[1] && row.book_id === scope[2];
}

export function createAnnotationStore(scope: Scope) {
  return createBookSyncStore<Annotation>("e-reader-annotations", scope);
}

export function createBookSyncStore<Row extends SyncRow>(name: string, scope: Scope): AnnotationQueue<Row> & {
  list(): Promise<Row[]>;
  save(annotation: Row): Promise<void>;
} {
  const access = <T,>(run: (db: Awaited<ReturnType<typeof openAnnotations<Row>>>) => Promise<T>) =>
    withAnnotations<Row, T>(name, run);
  return {
    list: async () => access(async db => {
      const rows = await db.getAllFromIndex("annotations", "byBook", scope);
      return rows.map(value => value.row).filter(row => row.deleted_at === null);
    }),
    save: async row => {
      if (!isForBook(scope, row) || row.author_id !== scope[0]) throw new Error("Invalid local annotation scope");
      const key: Key = [...scope, row.id];
      const operation = { revision: crypto.randomUUID(), annotation: row };
      await access(async db => {
        const tx = db.transaction(["annotations", "outbox"], "readwrite");
        await Promise.all([
          tx.objectStore("annotations").put({ scope, row }, key),
          tx.objectStore("outbox").put({ scope, operation }, key),
          tx.done,
        ]);
      });
    },
    pending: async () => access(async db => {
      const rows = await db.getAllFromIndex("outbox", "byBook", scope);
      return rows.map(value => value.operation);
    }),
    acknowledge: async (operation, row) => {
      if (!isForBook(scope, row) || row.id !== operation.annotation.id) throw new Error("Invalid annotation reply");
      const key: Key = [...scope, row.id];
      await access(async db => {
        const tx = db.transaction(["annotations", "outbox"], "readwrite");
        const outbox = tx.objectStore("outbox");
        const current = await outbox.get(key);
        if (current?.operation.revision === operation.revision) {
          await tx.objectStore("annotations").put({ scope, row }, key);
          await outbox.delete(key);
        }
        await tx.done;
      });
    },
    readCursor: async () => access(async db => await db.get("cursors", scope) ?? null),
    receive: async (rows, cursor) => {
      if (rows.some(row => !isForBook(scope, row))) throw new Error("Invalid annotation page");
      await access(async db => {
        const tx = db.transaction(["annotations", "outbox", "cursors"], "readwrite");
        const cursorStore = tx.objectStore("cursors");
        const prior = await cursorStore.get(scope);
        // Timestamp strings are compared without discarding Postgres microseconds.
        if (prior && compareCursor(prior, cursor) >= 0) {
          await tx.done;
          return;
        }
        for (const row of rows) {
          const key: Key = [...scope, row.id];
          if (await tx.objectStore("outbox").get(key)) continue;
          const content = tx.objectStore("annotations");
          const existing = (await content.get(key))?.row;
          if (!existing || !("updated_at" in existing) || existing.updated_at <= row.updated_at) {
            await content.put({ scope, row }, key);
          }
        }
        await cursorStore.put(cursor, scope);
        await tx.done;
      });
    },
  };
}
