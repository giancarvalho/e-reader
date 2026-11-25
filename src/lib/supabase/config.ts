export function getAuthConfig(env: Readonly<Record<string, string | undefined>>) {
  const { APP_ORIGIN, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = env;
  if (!APP_ORIGIN || !SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return null;

  const app = URL.parse(APP_ORIGIN);
  const supabase = URL.parse(SUPABASE_URL);
  if (!app || !supabase || !isHttpOrigin(app) || !isHttpOrigin(supabase)) return null;

  return {
    origin: app.origin,
    secure: app.protocol === "https:",
    url: supabase.origin,
    key: SUPABASE_PUBLISHABLE_KEY,
  };
}

function isHttpOrigin(url: URL) {
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  return (url.protocol === "https:" || (local && url.protocol === "http:"))
    && url.href === `${url.origin}/`;
}
