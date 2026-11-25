"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/design-system/components/Button";
import { TextField } from "@/design-system/components/TextField";
import { inspectEpub } from "@/lib/epub/inspect";
import { messages } from "@/lib/messages/pt-br";
import { prepareBookUpload, publishBook } from "./actions";
import styles from "./shelf.module.css";

async function uploadFile(hash: string, blob: Blob, cover: boolean) {
  const upload = await prepareBookUpload(hash, cover);
  if (!upload) throw new Error("Upload unavailable");
  if (!upload.url) return;

  const form = new FormData();
  form.append("cacheControl", "0");
  form.append("", blob, cover ? "cover" : "book.epub");
  const response = await fetch(upload.url, { method: "PUT", body: form, headers: { "x-upsert": "false" } });
  if (!response.ok) {
    const retry = await prepareBookUpload(hash, cover);
    if (!retry || retry.url) throw new Error("Upload failed");
  }
}

export function UploadBook() {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const { shelf } = messages;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const form = event.currentTarget;
    const file = new FormData(form).get("epub");
    if (!(file instanceof File) || !file.size) return;
    setBusy(true);
    setNotice("");

    try {
      const book = await inspectEpub(file).catch(() => null);
      if (!book) {
        setNotice(shelf.invalidEpub);
        return;
      }
      await uploadFile(book.hash, file.slice(0, file.size, "application/epub+zip"), false);
      if (book.cover) await uploadFile(book.hash, book.cover, true);

      const published = await publishBook({ ...book, cover: Boolean(book.cover) });
      if (!published) throw new Error("Publication failed");
      form.reset();
      setNotice(shelf.published);
    } catch {
      setNotice(shelf.uploadFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={styles.stack} onSubmit={onSubmit}>
      <TextField label={shelf.file} name="epub" type="file" accept=".epub,application/epub+zip" required disabled={busy} />
      <Button type="submit" loading={busy}>{shelf.publish}</Button>
      <div role="status">{busy ? shelf.uploading : notice}</div>
    </form>
  );
}
