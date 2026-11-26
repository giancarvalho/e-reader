import type { SupabaseClient } from "@supabase/supabase-js";
import { invitePath } from "@/lib/access/invite";

export async function redeemInvite(client: SupabaseClient, code: string): Promise<string> {
  const { data, error } = await client.rpc("join_group", { code }).single<{ status: string }>();
  return !error && data?.status === "joined" ? "/estante" : invitePath(code);
}
