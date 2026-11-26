export type AnnotationColor = "amber" | "green" | "blue" | "pink";

export type Annotation = {
  id: string;
  group_id: string;
  book_id: string;
  author_id: string;
  cfi: string;
  color: AnnotationColor;
  quote_text: string;
  note: string | null;
  name?: string | null;
  avatar?: string | null;
  deleted_at: string | null;
};

export type SyncRow = Pick<Annotation, "id" | "group_id" | "book_id" | "author_id" | "deleted_at">;
export type RemoteRow<Row extends SyncRow> = Row & { updated_at: string };
export type RemoteAnnotation = RemoteRow<Annotation>;
export type AnnotationCursor = { timestamp: string; id: string };
export type PendingAnnotation<Row extends SyncRow = Annotation> = { revision: string; annotation: Row };

export interface AnnotationTransport<Row extends SyncRow = Annotation> {
  send(annotation: Row): Promise<RemoteRow<Row>>;
  read(cursor: AnnotationCursor | null): Promise<RemoteRow<Row>[]>;
}

export interface AnnotationQueue<Row extends SyncRow = Annotation> {
  pending(): Promise<PendingAnnotation<Row>[]>;
  acknowledge(operation: PendingAnnotation<Row>, reply: RemoteRow<Row>): Promise<void>;
  readCursor(): Promise<AnnotationCursor | null>;
  receive(rows: RemoteRow<Row>[], cursor: AnnotationCursor): Promise<void>;
}

export function compareCursor(a: AnnotationCursor, b: AnnotationCursor) {
  if (a.timestamp < b.timestamp) return -1;
  if (a.timestamp > b.timestamp) return 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export async function syncAnnotations<Row extends SyncRow>(queue: AnnotationQueue<Row>, transport: AnnotationTransport<Row>) {
  for (const operation of await queue.pending()) {
    const reply = await transport.send(operation.annotation);
    if (reply.id !== operation.annotation.id) throw new Error("Unexpected annotation acknowledgement");
    await queue.acknowledge(operation, reply);
  }

  let cursor = await queue.readCursor();
  for (;;) {
    const page = await transport.read(cursor);
    const last = page.at(-1);
    if (!last) return;
    const next = { timestamp: last.updated_at, id: last.id };
    if (cursor && compareCursor(next, cursor) <= 0) {
      throw new Error("Annotation cursor did not advance");
    }
    await queue.receive(page, next);
    cursor = next;
  }
}
