"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getRequestAuth } from "@/lib/supabase/server";
import {
  encodeGoogleFlow, getGoogleConfig, googleAuthorizationUrl, googleFlowCookie,
  googleFlowLifetime, googleFlowPath, hasGoogleCredentials, newGoogleFlow,
} from "./google";

export async function signInWithGoogle() {
  const auth = await getRequestAuth(true);
  if (!auth) redirect("/entrar?status=unavailable");
  const { config, client } = auth;
  const { data: { user } } = await client.auth.getUser();
  if (user) redirect("/convite");

  const google = getGoogleConfig(process.env, config.origin);
  if (!google) {
    if (hasGoogleCredentials(process.env)) redirect("/entrar?status=unavailable");

    const { data, error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: new URL("/auth/callback", config.origin).href },
    });
    if (error || !data.url) redirect("/entrar?status=failed");
    redirect(data.url);
  }

  const flow = newGoogleFlow();
  const store = await cookies();
  store.set(googleFlowCookie, encodeGoogleFlow(flow), {
    httpOnly: true, secure: config.secure, sameSite: "lax", path: googleFlowPath, maxAge: googleFlowLifetime,
  });
  redirect(googleAuthorizationUrl(google, flow));
}

export async function signOut() {
  const auth = await getRequestAuth(true);
  if (auth) {
    const { error } = await auth.client.auth.signOut({ scope: "local" });
    if (error) redirect("/conta?status=signout_failed");
  }
  redirect("/entrar");
}
