/// <reference lib="webworker" />
import { NetworkOnly, Serwist, type PrecacheEntry, type SerwistGlobalConfig } from "serwist";

declare const self: ServiceWorkerGlobalScope & SerwistGlobalConfig & {
  __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
};

const worker = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  clientsClaim: true,
  runtimeCaching: [{
    matcher: ({ request, sameOrigin, url }) =>
      sameOrigin && request.mode === "navigate" && url.pathname === "/estante",
    handler: new NetworkOnly(),
  }],
  fallbacks: {
    entries: [{
      url: "/estante-offline",
      matcher: ({ request }) => request.mode === "navigate" && new URL(request.url).pathname === "/estante",
    }],
  },
});

worker.addEventListeners();
