import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { expect, it } from "vitest";

it("joins through the Supabase API and exposes the membership only after joining", async () => {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey || !["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname)) {
    throw new Error("Set the local Supabase URL, anon key and service role key for integration tests.");
  }

  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(url, serviceKey, options);
  const reader = createClient(url, anonKey, options);
  const email = `integration-${randomUUID()}@example.test`;
  const password = randomUUID();
  const groupId = randomUUID();
  const invitation = "INTEGRATIONTESTA";
  let userId: string | undefined;
  let groupCreated = false;

  try {
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    expect(created.error).toBeNull();
    userId = created.data.user?.id;
    expect(userId).toBeTruthy();

    const group = await admin.from("groups").insert({ id: groupId, name: "API integration test" });
    expect(group.error).toBeNull();
    groupCreated = true;
    const invite = await admin.from("group_invites").insert({ group_id: groupId, code: invitation });
    expect(invite.error).toBeNull();

    const signIn = await reader.auth.signInWithPassword({ email, password });
    expect(signIn.error).toBeNull();
    const before = await reader.from("memberships").select("group_id").eq("group_id", groupId).maybeSingle();
    expect(before).toMatchObject({ error: null, data: null });

    const invalid = await reader.rpc("join_group", { code: "wrong" }).single();
    expect(invalid).toMatchObject({ error: null, data: { status: "invalid_code", group_id: null } });

    const valid = await reader.rpc("join_group", { code: invitation }).single();
    expect(valid).toMatchObject({ error: null, data: { status: "joined", group_id: groupId } });

    const after = await reader.from("memberships").select("group_id, role").eq("group_id", groupId).single();
    expect(after).toMatchObject({ error: null, data: { group_id: groupId, role: "member" } });
  } finally {
    if (groupCreated) await admin.from("groups").delete().eq("id", groupId);
    if (userId) await admin.auth.admin.deleteUser(userId);
  }
});
