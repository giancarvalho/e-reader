"use server";

import type { ReaderIdentity } from "@/lib/books/local";
import { getRequestAuth } from "@/lib/supabase/server";
import type { Annotation, AnnotationCursor, RemoteAnnotation } from "@/lib/sync/annotations";

async function verifiedClient(identity: ReaderIdentity) {
  if (!/^[a-f0-9]{64}$/.test(identity.hash)) return null;
  const auth = await getRequestAuth(true);
  if (!auth) return null;
  const { data, error } = await auth.client.auth.getUser();
  return !error && data.user?.id === identity.user ? auth.client : null;
}

export async function pushAnnotation(identity: ReaderIdentity, row: Annotation): Promise<RemoteAnnotation | null> {
  if (row.author_id !== identity.user || row.group_id !== identity.group || row.book_id !== identity.hash) return null;
  const client = await verifiedClient(identity);
  if (!client) return null;
  const result = await client.from("annotations").upsert({
    id: row.id, group_id: row.group_id, book_id: row.book_id, author_id: row.author_id,
    cfi: row.cfi, color: row.color, quote_text: row.quote_text, note: row.note, deleted_at: row.deleted_at,
  }).select("id,group_id,book_id,author_id,cfi,color,quote_text,note,deleted_at,updated_at")
    .single<RemoteAnnotation>();
  return result.data;
}

export async function pullAnnotations(identity: ReaderIdentity, cursor: AnnotationCursor | null): Promise<RemoteAnnotation[] | null> {
  const client = await verifiedClient(identity);
  if (!client) return null;
  const result = await client.rpc("list_annotation_changes", {
    target_group: identity.group, target_book: identity.hash,
    after_stamp: cursor?.timestamp ?? null, after_id: cursor?.id ?? null,
  });
  return Array.isArray(result.data) ? result.data as RemoteAnnotation[] : null;
}
