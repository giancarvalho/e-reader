/// <reference lib="webworker" />
import { CacheFirst, ExpirationPlugin, NetworkFirst, NetworkOnly, Serwist, type PrecacheEntry, type SerwistGlobalConfig } from "serwist";

declare const self: ServiceWorkerGlobalScope & SerwistGlobalConfig & {
  __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
};

const worker = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  clientsClaim: true,
  precacheOptions: { cleanupOutdatedCaches: true },
  runtimeCaching: [
    {
      matcher: ({ request, sameOrigin, url }) => sameOrigin && request.method === "GET"
        && /^\/dict\/(pt|en)\/manifest\.json$/.test(url.pathname),
      handler: new NetworkFirst({ cacheName: "dictionary-manifests-v1", networkTimeoutSeconds: 3 }),
    },
    {
      matcher: ({ request, sameOrigin, url }) => sameOrigin && request.method === "GET"
        && /^\/dict\/(pt|en)\/([a-z]{1,2}|other)\.json$/.test(url.pathname),
      handler: new CacheFirst({
        cacheName: "dictionary-shards-v1",
        plugins: [new ExpirationPlugin({ maxEntries: 128, purgeOnQuotaError: true })],
      }),
    },
    {
      matcher: ({ request, sameOrigin, url }) =>
        sameOrigin && request.mode === "navigate" && url.pathname === "/estante",
      handler: new NetworkOnly(),
    },
  ],
  fallbacks: {
    entries: [{
      url: "/estante-offline",
      matcher: ({ request }) => request.mode === "navigate" && new URL(request.url).pathname === "/estante",
    }],
  },
});

worker.addEventListeners();
