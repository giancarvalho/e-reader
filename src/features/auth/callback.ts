import { NextResponse, type NextRequest } from "next/server";
import { getRequestAuth } from "@/lib/supabase/server";

export async function finishGoogleSignIn(request: NextRequest) {
  const auth = await getRequestAuth(true);
  const code = request.nextUrl.searchParams.get("code");
  let path = "/entrar?status=failed";

  if (auth && code) {
    const { error } = await auth.client.auth.exchangeCodeForSession(code);
    if (!error) path = "/convite";
  }

  return new NextResponse(null, {
    status: 303,
    headers: { Location: path, "Cache-Control": "private, no-store" },
  });
}
