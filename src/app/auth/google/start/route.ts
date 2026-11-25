import { getGoogleSignInDestination } from "@/features/auth/googleStart";

export async function GET() {
  return new Response(null, {
    status: 303,
    headers: {
      Location: await getGoogleSignInDestination(),
      "Cache-Control": "private, no-store",
    },
  });
}
