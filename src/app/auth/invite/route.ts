import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getRequestAuth } from "@/lib/supabase/server";
import { normalizeInviteCode, pendingInviteCookie, pendingInviteOptions } from "../../../lib/access/invite";
import { redeemInvite } from "../../../features/access/redeemInvite";

export async function POST(request: NextRequest) {
  const headers = { "Cache-Control": "private, no-store" };
  const auth = await getRequestAuth(true);
  if (!auth) return new NextResponse(null, { status: 503, headers });
  if (request.headers.get("origin") !== auth.config.origin) {
    return new NextResponse(null, { status: 403, headers });
  }
  const code = normalizeInviteCode((await request.json().catch(() => null))?.code);
  if (!code) return new NextResponse(null, { status: 400, headers });
  const { data, error } = await auth.client.auth.getUser();
  if (isAuthSessionMissingError(error) || error?.status === 401 || (!data.user && !error)) {
    return new NextResponse(null, { status: 401, headers });
  }
  if (error) return new NextResponse(null, { status: 503, headers });
  const response = NextResponse.json({ path: await redeemInvite(auth.client, code) }, { headers });
  if (request.cookies.get(pendingInviteCookie)?.value === code) {
    response.cookies.set(pendingInviteCookie, "", { ...pendingInviteOptions, maxAge: 0, secure: auth.config.secure });
  }
  return response;
}
