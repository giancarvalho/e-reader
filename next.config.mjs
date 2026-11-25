import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  additionalPrecacheEntries: [{ url: "/", revision: process.env.GITHUB_SHA ?? crypto.randomUUID() }],
});

export default withSerwist({ reactStrictMode: true, agentRules: false });
