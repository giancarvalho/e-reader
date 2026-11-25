import "fake-indexeddb/auto";
import { randomUUID } from "node:crypto";
import { expect, it, vi } from "vitest";
import { createAnnotationStore } from "./annotation-store";
import {
  compareCursor, syncAnnotations, type Annotation, type RemoteAnnotation,
} from "./annotations";

function fixture() {
  const user = randomUUID();
  const book = randomUUID();
  const group = randomUUID();
  const writer = createAnnotationStore([user, group, book]);
  const reader = createAnnotationStore([randomUUID(), group, book]);
  const annotation: Annotation = {
    id: randomUUID(), group_id: group, book_id: book, author_id: user, cfi: "epubcfi(/6/4)",
    color: "amber", quote_text: "Trecho", note: null, deleted_at: null,
  };
  const rows = new Map<string, RemoteAnnotation>();
  let tick = 0;
  const transport = {
    send: vi.fn(async (value: Annotation) => {
      const row = { ...value, updated_at: `2026-11-25T12:00:00.00000${++tick}+00:00` };
      rows.set(value.id, row);
      return row;
    }),
    read: vi.fn(async (cursor: { timestamp: string; id: string } | null) =>
      Array.from(rows.values()).filter(row =>
        !cursor || compareCursor({ timestamp: row.updated_at, id: row.id }, cursor) > 0,
      ).slice(0, 1),
    ),
  };
  return { annotation, writer, reader, transport };
}

it("sends offline additions once and syncs paginated additions and deletions to another account", async () => {
  const { annotation, writer, reader, transport } = fixture();
  const another = { ...annotation, id: randomUUID(), quote_text: "Outro trecho" };
  await writer.save(annotation);
  await writer.save(another);
  expect(await writer.list()).toHaveLength(2);
  expect(await reader.list()).toEqual([]);

  await syncAnnotations(writer, transport);
  await syncAnnotations(writer, transport);
  expect(transport.send).toHaveBeenCalledTimes(2);
  await syncAnnotations(reader, transport);
  expect(await reader.list()).toHaveLength(2);

  await writer.save({ ...annotation, deleted_at: "2026-11-25T12:00:00Z" });
  await syncAnnotations(writer, transport);
  await syncAnnotations(reader, transport);
  expect((await reader.list()).map(row => row.id)).toEqual([another.id]);
});

it("keeps later operations when a connection fails partway through the queue", async () => {
  const { annotation, writer, transport } = fixture();
  await writer.save(annotation);
  await writer.save({ ...annotation, id: randomUUID() });
  const original = transport.send.getMockImplementation()!;
  transport.send.mockImplementationOnce(original).mockRejectedValueOnce(new Error("offline"));
  await expect(syncAnnotations(writer, transport)).rejects.toThrow("offline");
  expect(await writer.pending()).toHaveLength(1);
  await syncAnnotations(writer, transport);
  expect(await writer.pending()).toEqual([]);
});

it("keeps an edit made while the previous version is uploading", async () => {
  const { annotation, writer, transport } = fixture();
  await writer.save(annotation);
  const original = transport.send.getMockImplementation()!;
  transport.send.mockImplementationOnce(async row => {
    await writer.save({ ...annotation, color: "blue" });
    return original(row);
  });
  await syncAnnotations(writer, transport);
  expect(await writer.list()).toMatchObject([{ color: "blue" }]);
  expect(await writer.pending()).toHaveLength(1);
  await syncAnnotations(writer, transport);
  expect(await writer.pending()).toEqual([]);
});
