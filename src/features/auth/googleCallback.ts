import { invitePath, normalizeInviteCode, pendingInviteCookie, pendingInviteOptions, signInPath } from "../../lib/access/invite";
import { NextResponse, type NextRequest } from "next/server";
import { getAuthConfig } from "../../lib/supabase/config";
import { createAuthClient } from "@/lib/supabase/server";
import { decodeGoogleFlow, exchangeGoogleCode, getGoogleConfig, googleFlowCookie, googleFlowPath } from "./google";

export async function finishDirectGoogleSignIn(request: NextRequest) {
  const invite = normalizeInviteCode(request.cookies.get(pendingInviteCookie)?.value);
  const params = request.nextUrl.searchParams;
  const flow = decodeGoogleFlow(request.cookies.get(googleFlowCookie)?.value);
  const auth = getAuthConfig(process.env);
  const config = auth && getGoogleConfig(process.env, auth.origin);
  const code = params.get("code");

  const response = new NextResponse(null, {
    status: 303,
    headers: {
      Location: signInPath("failed", invite),
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
  });

  if (auth && config && flow && code && !params.has("error") && params.get("state") === flow.state) {
    try {
      const credentials = await exchangeGoogleCode(config, flow, code);
      if (credentials) {
        const client = createAuthClient(auth, {
          getAll: () => request.cookies.getAll(),
          setAll: values => {
            for (const { name, value, options } of values) response.cookies.set(name, value, options);
          },
        });
        const { error } = await client.auth.signInWithIdToken(credentials);
        if (!error) response.headers.set("Location", invitePath(invite));
      }
    } catch {
      // Network failures and malformed provider responses return to the sign-in page.
    }
  }

  response.cookies.set(googleFlowCookie, "", {
    path: googleFlowPath, maxAge: 0, httpOnly: true, sameSite: "lax", secure: auth?.secure,
  });
  if (invite) response.cookies.set(pendingInviteCookie, "", { ...pendingInviteOptions, maxAge: 0, secure: auth?.secure });
  return response;
}
