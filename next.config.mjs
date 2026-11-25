import withSerwistInit from "@serwist/next";

const revision = process.env.GITHUB_SHA ?? crypto.randomUUID();

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  additionalPrecacheEntries: ["/", "/estante-offline", "/ler", "/diagnostico"].map(url => ({ url, revision })),
});

const commit = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA;
export default withSerwist({
  reactStrictMode: true,
  agentRules: false,
  env: { NEXT_PUBLIC_APP_VERSION: commit?.slice(0, 12) ?? "" },
});
