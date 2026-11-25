import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getAuthConfig } from "./config";

export type AuthConfig = NonNullable<ReturnType<typeof getAuthConfig>>;

export function createAuthClient(config: AuthConfig, methods: CookieMethodsServer) {
  return createServerClient(config.url, config.key, {
    cookieOptions: { httpOnly: true, sameSite: "lax", secure: config.secure },
    cookies: methods,
  });
}

export async function getRequestAuth(writable = false) {
  const config = getAuthConfig(process.env);
  if (!config) return null;

  const store = await cookies();
  const client = createAuthClient(config, {
    getAll: () => store.getAll(),
    setAll: writable ? (values) => {
      for (const { name, value, options } of values) store.set(name, value, options);
    } : async () => {
      // The proxy refreshes session cookies before rendering protected pages.
    },
  });
  return { client, config };
}

export async function getVerifiedReaderClient(identity: { user: string; hash: string }) {
  if (!/^[a-f0-9]{64}$/.test(identity.hash)) return null;
  const auth = await getRequestAuth(true);
  if (!auth) return null;
  const { data, error } = await auth.client.auth.getUser();
  return !error && data.user?.id === identity.user ? auth.client : null;
}
