import { redirect } from "next/navigation";
import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { signInPath } from "../../lib/access/invite";
import { getRequestAuth } from "@/lib/supabase/server";

export async function getGroupAccess(invite?: string) {
  const auth = await getRequestAuth();
  if (!auth) redirect(signInPath(undefined, invite));

  const { data, error } = await auth.client.auth.getUser();
  if (isAuthSessionMissingError(error) || error?.status === 401 || (!data.user && !error)) {
    redirect(signInPath(undefined, invite));
  }
  if (error || !data.user) return { status: "unavailable" } as const;

  const membership = await auth.client
    .from("memberships")
    .select("group_id, role")
    .eq("user_id", data.user.id)
    .order("joined_at")
    .order("group_id")
    .limit(1)
    .maybeSingle();

  if (membership.error) return { status: "unavailable" } as const;
  if (!membership.data) return { status: "invite_required", client: auth.client } as const;

  return {
    status: "member",
    userId: data.user.id,
    groupId: membership.data.group_id as string,
    organizer: membership.data.role === "organizer",
    client: auth.client,
  } as const;
}
