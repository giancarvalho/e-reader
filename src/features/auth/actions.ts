"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getRequestAuth } from "@/lib/supabase/server";
import { getAuthConfig } from "@/lib/supabase/config";
import {
  encodeGoogleFlow, getGoogleConfig, googleAuthorizationUrl, googleFlowCookie,
  googleFlowLifetime, googleFlowPath, hasGoogleCredentials, newGoogleFlow,
} from "./google";

export async function signInWithGoogle() {
  const auth = getAuthConfig(process.env);
  const google = auth && getGoogleConfig(process.env, auth.origin);
  if (!auth) redirect("/entrar?status=unavailable");
  if (!google) {
    if (hasGoogleCredentials(process.env)) redirect("/entrar?status=unavailable");

    const request = await getRequestAuth(true);
    if (!request) redirect("/entrar?status=unavailable");
    const { data, error } = await request.client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: new URL("/auth/callback", auth.origin).href },
    });
    if (error || !data.url) redirect("/entrar?status=failed");
    redirect(data.url);
  }

  const flow = newGoogleFlow();
  const store = await cookies();
  store.set(googleFlowCookie, encodeGoogleFlow(flow), {
    httpOnly: true, secure: auth.secure, sameSite: "lax", path: googleFlowPath, maxAge: googleFlowLifetime,
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
