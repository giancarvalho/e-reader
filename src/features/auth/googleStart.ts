import { cookies } from "next/headers";
import { getRequestAuth } from "@/lib/supabase/server";
import {
  encodeGoogleFlow, getGoogleConfig, googleAuthorizationUrl, googleFlowCookie,
  googleFlowLifetime, googleFlowPath, hasGoogleCredentials, newGoogleFlow,
} from "./google";

export async function getGoogleSignInDestination() {
  const auth = await getRequestAuth(true);
  if (!auth) return "/entrar?status=unavailable";
  const { config, client } = auth;
  const { data: { user } } = await client.auth.getUser();
  if (user) return "/convite";

  const google = getGoogleConfig(process.env, config.origin);
  if (!google) {
    if (hasGoogleCredentials(process.env)) return "/entrar?status=unavailable";

    const { data, error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: new URL("/auth/callback", config.origin).href },
    });
    return error || !data.url ? "/entrar?status=failed" : data.url;
  }

  const flow = newGoogleFlow();
  const store = await cookies();
  store.set(googleFlowCookie, encodeGoogleFlow(flow), {
    httpOnly: true, secure: config.secure, sameSite: "lax", path: googleFlowPath, maxAge: googleFlowLifetime,
  });
  return googleAuthorizationUrl(google, flow);
}
