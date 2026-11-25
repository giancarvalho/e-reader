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
  deleted_at: string | null;
};

export type RemoteAnnotation = Annotation & { updated_at: string };
export type AnnotationCursor = { timestamp: string; id: string };
export type PendingAnnotation = { revision: string; annotation: Annotation };

export interface AnnotationTransport {
  send(annotation: Annotation): Promise<RemoteAnnotation>;
  read(cursor: AnnotationCursor | null): Promise<RemoteAnnotation[]>;
}

export interface AnnotationQueue {
  pending(): Promise<PendingAnnotation[]>;
  acknowledge(operation: PendingAnnotation, reply: RemoteAnnotation): Promise<void>;
  readCursor(): Promise<AnnotationCursor | null>;
  receive(rows: RemoteAnnotation[], cursor: AnnotationCursor): Promise<void>;
}

export function compareCursor(a: AnnotationCursor, b: AnnotationCursor) {
  if (a.timestamp < b.timestamp) return -1;
  if (a.timestamp > b.timestamp) return 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export async function syncAnnotations(queue: AnnotationQueue, transport: AnnotationTransport) {
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
