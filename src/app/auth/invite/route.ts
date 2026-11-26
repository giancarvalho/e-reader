import { NextResponse, type NextRequest } from "next/server";
import { getRequestAuth } from "@/lib/supabase/server";
import { normalizeInviteCode } from "@/lib/access/invite";
import { redeemInvite } from "@/features/access/redeemInvite";

export async function POST(request: NextRequest) {
  const headers = { "Cache-Control": "private, no-store" };
  if (request.headers.get("origin") !== request.nextUrl.origin) return new NextResponse(null, { status: 403, headers });
  const code = normalizeInviteCode((await request.json().catch(() => null))?.code);
  if (!code) return new NextResponse(null, { status: 400, headers });
  const auth = await getRequestAuth(true);
  if (!auth) return new NextResponse(null, { status: 401, headers });
  const { data } = await auth.client.auth.getUser();
  if (!data.user) return new NextResponse(null, { status: 401, headers });
  return NextResponse.json({ path: await redeemInvite(auth.client, code) }, { headers });
}
