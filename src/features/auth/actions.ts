"use server";

import { redirect } from "next/navigation";
import { getRequestAuth } from "@/lib/supabase/server";

export async function signInWithGoogle() {
  const auth = await getRequestAuth(true);
  if (!auth) redirect("/entrar?status=unavailable");

  const { data, error } = await auth.client.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: new URL("/auth/callback", auth.config.origin).href },
  });
  if (error || !data.url) redirect("/entrar?status=failed");
  redirect(data.url);
}

export async function signOut() {
  const auth = await getRequestAuth(true);
  if (auth) {
    const { error } = await auth.client.auth.signOut({ scope: "local" });
    if (error) redirect("/conta?status=signout_failed");
  }
  redirect("/entrar");
}
