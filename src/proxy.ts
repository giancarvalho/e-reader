import { NextResponse, type NextRequest } from "next/server";
import { getAuthConfig } from "@/lib/supabase/config";
import { createAuthClient } from "@/lib/supabase/server";

export async function proxy(request: NextRequest) {
  const config = getAuthConfig(process.env);
  if (!config) return NextResponse.next();

  let response = NextResponse.next({ request });
  const client = createAuthClient(config, {
    getAll: () => request.cookies.getAll(),
    setAll: (values, headers) => {
      for (const { name, value } of values) request.cookies.set(name, value);
      response = NextResponse.next({ request });
      for (const { name, value, options } of values) response.cookies.set(name, value, options);
      for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
    },
  });

  await client.auth.getClaims();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = { matcher: ["/conta/:path*", "/convite/:path*", "/estante/:path*"] };
