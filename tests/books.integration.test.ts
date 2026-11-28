import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { expect, it } from "vitest";

it("publishes an organizer upload and delivers its bytes only to members", async () => {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service || !["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname)) {
    throw new Error("Configure local Supabase for integration tests.");
  }
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(url, service, options);
  const group = randomUUID();
  const users: string[] = [];
  const bytes = new Blob(["storage fixture epub bytes"], { type: "application/epub+zip" });
  const hash = createHash("sha256").update(Buffer.from(await bytes.arrayBuffer())).digest("hex");
  const path = `${group}/${hash}.epub`;

  async function createAccount(endpoint: string, key: string, role?: "organizer" | "member") {
    const email = `shelf-${randomUUID()}@example.test`;
    const password = randomUUID();
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    expect(created.error).toBeNull();
    if (!created.data.user) throw new Error("Missing test account");
    const id = created.data.user.id;
    users.push(id);
    if (role) {
      expect((await admin.from("memberships").insert({ group_id: group, user_id: id, role })).error).toBeNull();
    }
    const client = createClient(endpoint, key, options);
    expect((await client.auth.signInWithPassword({ email, password })).error).toBeNull();
    return client;
  }

  try {
    expect((await admin.from("groups").insert({ id: group, name: "Shelf integration" })).error).toBeNull();
    const organizer = await createAccount(url, anon, "organizer");
    const member = await createAccount(url, anon, "member");
    const otherMember = await createAccount(url, anon, "member");
    const outsider = await createAccount(url, anon);
    const organizerStorage = organizer.storage.from("books");
    const memberStorage = member.storage.from("books");
    expect((await memberStorage.createSignedUploadUrl(path)).error).toBeTruthy();
    const upload = await organizerStorage.createSignedUploadUrl(path);
    expect(upload.error).toBeNull();
    if (!upload.data) throw new Error("Missing upload URL");
    expect((await organizerStorage.uploadToSignedUrl(path, upload.data.token, bytes)).error).toBeNull();
    expect((await organizerStorage.exists(path)).data).toBe(true);
    expect((await memberStorage.createSignedUrl(path, 120)).error).toBeTruthy();

    const metadata = {
      target_group: group, book_hash: hash, book_title: "Integration EPUB",
      book_author: null, book_language: "pt", has_cover: false,
    };
    expect((await organizer.rpc("publish_book", metadata)).error).toBeNull();
    expect((await organizer.rpc("publish_book", metadata)).error).toBeNull();
    const list = await member.from("books").select("id, is_current").eq("group_id", group);
    expect(list).toMatchObject({ error: null, data: [{ id: hash, is_current: true }] });
    expect((await outsider.from("books").select("id").eq("group_id", group)).data).toEqual([]);
    expect((await outsider.storage.from("books").createSignedUrl(path, 120)).error).toBeTruthy();

    const download = await memberStorage.createSignedUrl(path, 120);
    expect(download.error).toBeNull();
    if (!download.data) throw new Error("Missing download URL");
    const response = await fetch(download.data.signedUrl);
    expect(response.ok).toBe(true);
    expect(await response.text()).toBe(await bytes.text());

    const userId = (await member.auth.getUser()).data.user?.id;
    expect(userId).toBeTruthy();
    const uploadedProgress = await member.from("progress").upsert({
      group_id: group, book_id: hash, user_id: userId, cfi: "epubcfi(/6/4)", fraction: 0.4,
    }).select("cfi,fraction,updated_at").single();
    expect(uploadedProgress).toMatchObject({
      error: null, data: { cfi: "epubcfi(/6/4)", fraction: 0.4, updated_at: expect.any(String) },
    });
    const uploadedPreferences = await member.from("user_preferences").upsert({
      user_id: userId, theme: "custom", custom_bg: "#000000", custom_ink: "#ffffff",
      font_size: 24, font_family: "sans",
    }).select("theme,font_size,updated_at").single();
    expect(uploadedPreferences).toMatchObject({
      error: null, data: { theme: "custom", font_size: 24, updated_at: expect.any(String) },
    });
    expect((await otherMember.from("progress").select("cfi").eq("user_id", userId)).data).toEqual([]);
    expect((await otherMember.from("user_preferences").select("theme").eq("user_id", userId)).data).toEqual([]);
    for (const theme of ["day", "sunset", "night", "midnight"]) {
      expect((await member.from("user_preferences").upsert({ user_id: userId, theme })).error).toBeNull();
    }
    expect((await member.from("user_preferences").upsert({ user_id: userId, theme: "neon" })).error).not.toBeNull();

    const annotation = {
      id: randomUUID(), group_id: group, book_id: hash, author_id: userId,
      cfi: "epubcfi(/6/4)", color: "amber", quote_text: "Example quote",
    };
    expect((await member.from("annotations").upsert(annotation)).error).toBeNull();
    const changes = { target_group: group, target_book: hash };
    const firstPage = await otherMember.rpc("list_annotation_changes", changes);
    expect(firstPage).toMatchObject({ error: null, data: [{ id: annotation.id, deleted_at: null }] });
    const cursor = firstPage.data[0].updated_at;

    const otherId = (await otherMember.auth.getUser()).data.user?.id;
    const reply = {
      id: randomUUID(), group_id: group, book_id: hash, author_id: otherId,
      annotation_id: annotation.id, text: "Group response",
    };
    expect((await otherMember.from("comments").upsert(reply)).error).toBeNull();
    const answer = { ...reply, id: randomUUID(), author_id: userId, text: "Author response" };
    expect((await member.from("comments").upsert(answer)).error).toBeNull();
    const thread = await member.rpc("list_comment_changes", changes);
    expect(thread).toMatchObject({ error: null, data: [
      { id: reply.id, text: "Group response" }, { id: answer.id, text: "Author response" },
    ] });
    expect((await otherMember.from("comments").upsert({
      ...reply, deleted_at: new Date().toISOString(),
    })).error).toBeNull();
    const replyTombstone = await member.rpc("list_comment_changes", {
      ...changes, after_stamp: thread.data[1].updated_at, after_id: answer.id,
    });
    expect(replyTombstone).toMatchObject({ error: null, data: [{ id: reply.id, deleted_at: expect.any(String) }] });
    expect((await member.from("annotations").upsert({ ...annotation, deleted_at: new Date().toISOString() })).error).toBeNull();
    const tombstones = await otherMember.rpc("list_annotation_changes", { ...changes, after_stamp: cursor, after_id: annotation.id });
    expect(tombstones).toMatchObject({ error: null, data: [{ id: annotation.id, deleted_at: expect.any(String) }] });
    expect((await outsider.rpc("list_annotation_changes", changes)).data).toEqual([]);
  } finally {
    await admin.storage.from("books").remove([path]);
    await admin.from("groups").delete().eq("id", group);
    await Promise.all(users.map(id => admin.auth.admin.deleteUser(id)));
  }
}, 20_000);
