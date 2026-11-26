import { invitePath, normalizeInviteCode, pendingInviteCookie, pendingInviteOptions, signInPath } from "../../lib/access/invite";
import { redeemInvite } from "../access/redeemInvite";
import { NextResponse, type NextRequest } from "next/server";
import { getRequestAuth } from "@/lib/supabase/server";

export async function finishGoogleSignIn(request: NextRequest) {
  const auth = await getRequestAuth(true);
  const code = request.nextUrl.searchParams.get("code");
  const invite = normalizeInviteCode(request.cookies.get(pendingInviteCookie)?.value);
  let path = signInPath("failed", invite);

  if (auth && code) {
    const { error } = await auth.client.auth.exchangeCodeForSession(code);
    if (!error) path = invite ? await redeemInvite(auth.client, invite) : invitePath();
  }

  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: path, "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" },
  });
  if (invite) response.cookies.set(pendingInviteCookie, "", { ...pendingInviteOptions, maxAge: 0, secure: auth?.config.secure });
  return response;
}
