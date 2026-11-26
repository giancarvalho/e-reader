"use server";

import type { ReaderIdentity } from "@/lib/books/local";
import { getVerifiedReaderClient } from "@/lib/supabase/server";
import { withProfiles } from "@/lib/sync/with-profiles";
import type { Annotation, AnnotationCursor, RemoteAnnotation } from "@/lib/sync/annotations";

export async function pushAnnotation(identity: ReaderIdentity, row: Annotation): Promise<RemoteAnnotation | null> {
  if (row.author_id !== identity.user || row.group_id !== identity.group || row.book_id !== identity.hash) return null;
  const client = await getVerifiedReaderClient(identity);
  if (!client) return null;
  const result = await client.from("annotations").upsert({
    id: row.id, group_id: row.group_id, book_id: row.book_id, author_id: row.author_id,
    cfi: row.cfi, color: row.color, quote_text: row.quote_text, note: row.note, deleted_at: row.deleted_at,
  }).select("id,group_id,book_id,author_id,cfi,color,quote_text,note,deleted_at,updated_at")
    .single<RemoteAnnotation>();
  return result.data ? (await withProfiles(client, [result.data]))[0] : null;
}

export async function pullAnnotations(identity: ReaderIdentity, cursor: AnnotationCursor | null): Promise<RemoteAnnotation[] | null> {
  const client = await getVerifiedReaderClient(identity);
  if (!client) return null;
  const result = await client.rpc("list_annotation_changes", {
    target_group: identity.group, target_book: identity.hash,
    after_stamp: cursor?.timestamp ?? null, after_id: cursor?.id ?? null,
  });
  return Array.isArray(result.data) ? withProfiles(client, result.data as RemoteAnnotation[]) : null;
}

export async function getNoteAuthor(identity: ReaderIdentity, annotationId: string) {
  const client = await getVerifiedReaderClient(identity);
  if (!client) return null;
  const { data } = await client.from("annotations").select("author_id")
    .eq("id", annotationId).eq("group_id", identity.group).eq("book_id", identity.hash)
    .is("deleted_at", null).maybeSingle();
  if (!data) return null;
  const [author] = await withProfiles(client, [data]);
  return { name: author.name, avatar: author.avatar };
}
