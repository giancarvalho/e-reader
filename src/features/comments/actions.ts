"use server";

import type { ReaderIdentity } from "@/lib/books/local";
import { getVerifiedReaderClient } from "@/lib/supabase/server";
import type { AnnotationCursor, RemoteRow } from "@/lib/sync/annotations";
import { withProfiles } from "@/lib/sync/with-profiles";
import type { Comment } from "./types";

const fields = "id,annotation_id,group_id,book_id,author_id,text,created_at,updated_at,deleted_at";

export async function pushComment(identity: ReaderIdentity, row: Comment): Promise<RemoteRow<Comment> | null> {
  if (row.author_id !== identity.user || row.group_id !== identity.group || row.book_id !== identity.hash) return null;
  const client = await getVerifiedReaderClient(identity);
  if (!client) return null;

  const { data: parent } = await client.from("annotations").select("deleted_at")
    .eq("id", row.annotation_id).eq("group_id", identity.group).eq("book_id", identity.hash).maybeSingle();
  if (!parent) return null;
  if (parent.deleted_at) return { ...row, deleted_at: parent.deleted_at, updated_at: parent.deleted_at };

  const result = await client.from("comments").upsert({
    id: row.id, annotation_id: row.annotation_id, group_id: row.group_id, book_id: row.book_id,
    author_id: row.author_id, text: row.text, deleted_at: row.deleted_at,
  }).select(fields).single<RemoteRow<Comment>>();
  if (!result.data) return null;
  return (await withProfiles(client, [result.data]))[0];
}

export async function pullComments(identity: ReaderIdentity, cursor: AnnotationCursor | null): Promise<RemoteRow<Comment>[] | null> {
  const client = await getVerifiedReaderClient(identity);
  if (!client) return null;
  const result = await client.rpc("list_comment_changes", {
    target_group: identity.group, target_book: identity.hash,
    after_stamp: cursor?.timestamp ?? null, after_id: cursor?.id ?? null,
  });
  return Array.isArray(result.data) ? withProfiles(client, result.data as RemoteRow<Comment>[]) : null;
}
