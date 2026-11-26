import type { SupabaseClient } from "@supabase/supabase-js";
import { invitePath } from "../../lib/access/invite";

export async function redeemInvite(client: SupabaseClient, code: string): Promise<string> {
  try {
    const { data, error } = await client.rpc("join_group", { code }).single<{ status: string }>();
    if (!error) {
      if (data?.status === "joined") return "/estante";
      if (data?.status === "invalid_code" || data?.status === "rate_limited") {
        return invitePath(code, data.status);
      }
    }
  } catch {
    // Keep the code available to retry after a connection failure.
  }
  return invitePath(code, "unavailable");
}
