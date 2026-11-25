/// <reference lib="webworker" />
import { Serwist, type PrecacheEntry, type SerwistGlobalConfig } from "serwist";

declare const self: ServiceWorkerGlobalScope & SerwistGlobalConfig & {
  __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
};

const worker = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  clientsClaim: true,
});

worker.addEventListeners();
