import { NextResponse, type NextRequest } from "next/server";
import { getRequestAuth } from "@/lib/supabase/server";
import { decodeGoogleFlow, exchangeGoogleCode, getGoogleConfig, googleFlowCookie, googleFlowPath } from "./google";

export async function finishDirectGoogleSignIn(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const flow = decodeGoogleFlow(request.cookies.get(googleFlowCookie)?.value);
  const auth = await getRequestAuth(true);
  const config = auth && getGoogleConfig(process.env, auth.config.origin);
  const code = params.get("code");
  let location = "/entrar?status=failed";

  if (auth && config && flow && code && !params.has("error") && params.get("state") === flow.state) {
    try {
      const credentials = await exchangeGoogleCode(config, flow, code);
      if (credentials) {
        const { error } = await auth.client.auth.signInWithIdToken(credentials);
        if (!error) location = "/convite";
      }
    } catch {
      // Network failures and malformed provider responses return to the sign-in page.
    }
  }

  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: location, "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" },
  });
  response.cookies.set(googleFlowCookie, "", {
    path: googleFlowPath, maxAge: 0, httpOnly: true, sameSite: "lax", secure: auth?.config.secure,
  });
  return response;
}
