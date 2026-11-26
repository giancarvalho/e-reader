import type { NextRequest } from "next/server";
import { getGoogleSignInDestination } from "@/features/auth/googleStart";

export async function GET(request: NextRequest) {
  return new Response(null, {
    status: 303,
    headers: {
      Location: await getGoogleSignInDestination(request.nextUrl.searchParams.get("codigo") ?? undefined),
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
