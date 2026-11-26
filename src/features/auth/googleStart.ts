import { homeInvitePath, invitePath, normalizeInviteCode, pendingInviteCookie, pendingInviteOptions, signInPath } from "../../lib/access/invite";
import { cookies } from "next/headers";
import { getRequestAuth } from "@/lib/supabase/server";
import {
  encodeGoogleFlow, getGoogleConfig, googleAuthorizationUrl, googleFlowCookie,
  googleFlowLifetime, googleFlowPath, hasGoogleCredentials, newGoogleFlow,
} from "./google";

export async function getGoogleSignInDestination(inviteValue?: string) {
  const invite = normalizeInviteCode(inviteValue);
  const auth = await getRequestAuth(true);
  if (!auth) return signInPath("unavailable", invite);
  const { config, client } = auth;
  const { data: { user } } = await client.auth.getUser();
  if (user) return invite ? homeInvitePath(invite) : invitePath();
  const store = await cookies();
  if (invite || store.get(pendingInviteCookie)) {
    store.set(pendingInviteCookie, invite ?? "", {
      ...pendingInviteOptions, maxAge: invite ? pendingInviteOptions.maxAge : 0, secure: config.secure,
    });
  }

  const google = getGoogleConfig(process.env, config.origin);
  if (!google) {
    if (hasGoogleCredentials(process.env)) return signInPath("unavailable", invite);

    const { data, error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: new URL("/auth/callback", config.origin).href },
    });
    return error || !data.url ? signInPath("failed", invite) : data.url;
  }

  const flow = newGoogleFlow();
  store.set(googleFlowCookie, encodeGoogleFlow(flow), {
    httpOnly: true, secure: config.secure, sameSite: "lax", path: googleFlowPath, maxAge: googleFlowLifetime,
  });
  return googleAuthorizationUrl(google, flow);
}
