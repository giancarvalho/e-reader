"use server";

import { revalidatePath } from "next/cache";
import { getGroupAccess } from "@/features/access";

const validHash = (hash: string) => /^[a-f0-9]{64}$/.test(hash);

export async function prepareBookUpload(hash: string, cover: boolean) {
  const access = await getGroupAccess();
  if (access.status !== "member" || !access.organizer || !validHash(hash)) return null;
  const path = `${access.groupId}/${hash}.${cover ? "cover" : "epub"}`;
  const bucket = access.client.storage.from("books");

  const existing = await bucket.exists(path);
  if (existing.data) return { url: null };

  const { data, error } = await bucket.createSignedUploadUrl(path);
  return error ? null : { url: data.signedUrl };
}

type Metadata = { hash: string; title: string; author: string | null; language: string | null; cover: boolean };

export async function publishBook(book: Metadata) {
  const access = await getGroupAccess();
  if (access.status !== "member" || !access.organizer || !validHash(book.hash)) return false;

  const { error } = await access.client.rpc("publish_book", {
    target_group: access.groupId,
    book_hash: book.hash,
    book_title: book.title,
    book_author: book.author,
    book_language: book.language,
    has_cover: book.cover,
  });
  if (!error) revalidatePath("/estante");
  return !error;
}

export async function editShelf(book: string, move: "current" | "up" | "down") {
  const access = await getGroupAccess();
  if (access.status !== "member" || !access.organizer || !validHash(book)) return false;
  const args = { target_group: access.groupId, book_hash: book };
  const result = move === "current"
    ? await access.client.rpc("set_current_book", args)
    : await access.client.rpc("move_book", { ...args, direction: move === "up" ? -1 : 1 });

  if (!result.error) revalidatePath("/estante");
  return !result.error;
}

export async function getBookDownload(hash: string) {
  const access = await getGroupAccess();
  if (access.status !== "member" || !validHash(hash)) return null;

  const { data } = await access.client.from("books").select("file_path, cover_path")
    .eq("group_id", access.groupId).eq("id", hash).maybeSingle();
  if (!data) return null;

  const bucket = access.client.storage.from("books");
  const { data: links } = await bucket.createSignedUrls(
    data.cover_path ? [data.file_path, data.cover_path] : [data.file_path], 120,
  );
  if (!links?.[0]?.signedUrl) return null;
  return { userId: access.userId, file: links[0].signedUrl, cover: links[1]?.signedUrl ?? null };
}
