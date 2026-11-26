"use server";

import { redirect } from "next/navigation";
import { getRequestAuth } from "@/lib/supabase/server";
import { getGoogleSignInDestination } from "./googleStart";

export async function signInWithGoogle(form?: FormData) {
  const invite = form?.get("codigo");
  redirect(await getGoogleSignInDestination(typeof invite === "string" ? invite : undefined));
}

export async function signOut() {
  const auth = await getRequestAuth(true);
  if (auth) {
    const { error } = await auth.client.auth.signOut({ scope: "local" });
    if (error) redirect("/conta?status=signout_failed");
  }
  redirect("/entrar");
}
