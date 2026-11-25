"use server";

import { redirect } from "next/navigation";
import { getRequestAuth } from "@/lib/supabase/server";
import type { InviteState } from "./state";

export async function joinGroup(_previous: InviteState, form: FormData): Promise<InviteState> {
  const auth = await getRequestAuth(true);
  if (!auth) redirect("/entrar");

  const code = form.get("code");
  if (typeof code !== "string" || code.length > 128) return { error: "invalid_code" };

  const { data, error } = await auth.client.rpc("join_group", { code }).single<{ status: string }>();
  if (error?.code === "42501" || error?.code === "PGRST301") redirect("/entrar");
  if (error || !data) return { error: "unavailable" };

  switch (data.status) {
    case "joined":
      redirect("/estante");
    case "invalid_code":
    case "rate_limited":
      return { error: data.status };
    default:
      return { error: "unavailable" };
  }
}
