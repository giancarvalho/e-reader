import type { getVerifiedReaderClient } from "@/lib/supabase/server";
import type { SyncRow } from "./annotations";

type Client = NonNullable<Awaited<ReturnType<typeof getVerifiedReaderClient>>>;

export async function withProfiles<Row extends Pick<SyncRow, "author_id">>(client: Client, rows: Row[]) {
  if (!rows.length) return [];
  const authors = [...new Set(rows.map(row => row.author_id))];
  const result = await client.from("profiles").select("id,display_name,avatar_url").in("id", authors);
  const profiles = new Map(result.data?.map(profile => [profile.id, profile]) ?? []);
  return rows.map(row => {
    const profile = profiles.get(row.author_id);
    return { ...row, name: profile?.display_name ?? null, avatar: profile?.avatar_url ?? null };
  });
}
