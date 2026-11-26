"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { BookCard } from "@/design-system/components/BookCard";
import { Button } from "@/design-system/components/Button";
import { Notice } from "@/design-system/components/Notice";
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
  const [inspecting, setInspecting] = useState(false);
  const [selected, setSelected] = useState<{ file: File; book: Awaited<ReturnType<typeof inspectEpub>> }>();
  const [cover, setCover] = useState<string>();
  const picking = useRef(0);
  const { shelf } = messages;

  useEffect(() => {
    if (cover) return () => URL.revokeObjectURL(cover);
  }, [cover]);

  async function choose(file: File | undefined) {
    const request = ++picking.current;
    setSelected(undefined);
    setCover(undefined);
    setNotice("");
    setInspecting(Boolean(file));
    if (!file) return;
    const book = await inspectEpub(file).catch(() => null);
    if (picking.current !== request) return;
    if (book) {
      setSelected({ file, book });
      if (book.cover) setCover(URL.createObjectURL(book.cover));
    } else setNotice(shelf.invalidEpub);
    setInspecting(false);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !selected) return;

    const form = event.currentTarget;
    const { file, book } = selected;
    setBusy(true);
    setNotice("");

    try {
      await uploadFile(book.hash, file.slice(0, file.size, "application/epub+zip"), false);
      if (book.cover) await uploadFile(book.hash, book.cover, true);

      const published = await publishBook({ ...book, cover: Boolean(book.cover) });
      if (!published) throw new Error("Publication failed");
      form.reset();
      setSelected(undefined);
      setCover(undefined);
      setNotice(shelf.published);
    } catch {
      setNotice(shelf.uploadFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={styles.stack} onSubmit={onSubmit}>
      <TextField label={shelf.file} name="epub" type="file" accept=".epub,application/epub+zip" required disabled={busy}
        onChange={event => void choose(event.target.files?.[0])} />
      {selected && <BookCard title={selected.book.title} author={selected.book.author} cover={cover} />}
      <Button type="submit" loading={busy} disabled={!selected || inspecting}>{shelf.publish}</Button>
      <Notice>{busy ? shelf.uploading : inspecting ? shelf.inspecting : notice}</Notice>
    </form>
  );
}
