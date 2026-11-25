import withSerwistInit from "@serwist/next";

const revision = process.env.GITHUB_SHA ?? crypto.randomUUID();

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  additionalPrecacheEntries: [
    "/", "/estante-offline", "/ler", "/diagnostico", "/manifest.webmanifest",
    "/icons/book-192.png", "/icons/book-512.png",
  ].map(url => ({ url, revision })),
});

const commit = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA;
const supabase = URL.parse(process.env.SUPABASE_URL ?? "");
const dictionaries = supabase && (supabase.protocol === "https:" || supabase.protocol === "http:")
  ? `${supabase.origin}/storage/v1/object/public/dictionaries`
  : null;

export default withSerwist({
  reactStrictMode: true,
  agentRules: false,
  env: { NEXT_PUBLIC_APP_VERSION: commit?.slice(0, 12) ?? "" },
  async rewrites() {
    if (!dictionaries) return [];
    return {
      fallback: [
        {
          source: "/dict/:language(pt|en)/manifest.json",
          destination: `${dictionaries}/:language/manifest.json`,
        },
        {
          source: "/dict/:language(pt|en)/:prefix([a-z]{1,2}|other).json",
          has: [{ type: "query", key: "v", value: "(?<revision>[a-f0-9]{64})" }],
          destination: `${dictionaries}/:language/:revision/:prefix.json`,
        },
      ],
    };
  },
});
