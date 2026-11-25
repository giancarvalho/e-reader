import { redirect } from "next/navigation";
import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { getRequestAuth } from "@/lib/supabase/server";

type MembershipStatus = "member" | "invite_required" | "unavailable";

export async function getMembershipStatus(): Promise<MembershipStatus> {
  const auth = await getRequestAuth();
  if (!auth) redirect("/entrar");

  const { data, error } = await auth.client.auth.getUser();
  if (isAuthSessionMissingError(error) || error?.status === 401 || (!data.user && !error)) {
    redirect("/entrar");
  }
  if (error || !data.user) return "unavailable";

  const membership = await auth.client
    .from("memberships")
    .select("group_id")
    .eq("user_id", data.user.id)
    .limit(1)
    .maybeSingle();

  if (membership.error) return "unavailable";
  return membership.data ? "member" : "invite_required";
}
