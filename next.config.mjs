import withSerwistInit from "@serwist/next";

const revision = process.env.GITHUB_SHA ?? crypto.randomUUID();

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  additionalPrecacheEntries: ["/", "/estante-offline", "/ler"].map(url => ({ url, revision })),
});

export default withSerwist({ reactStrictMode: true, agentRules: false });
