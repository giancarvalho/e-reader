/// <reference lib="webworker" />

import type { DictionaryLanguage } from "./catalog";
import { downloadDictionary, type DictionaryDownloadMessage } from "./offline-download";

const scope = self as unknown as DedicatedWorkerGlobalScope;
let active: AbortController | undefined;

function report(message: DictionaryDownloadMessage) {
  scope.postMessage(message);
}

scope.onmessage = (event: MessageEvent<{ language: DictionaryLanguage } | { cancel: true }>) => {
  if ("cancel" in event.data) {
    active?.abort();
    return;
  }
  if (active) return;
  const controller = new AbortController();
  active = controller;
  void downloadDictionary(event.data.language, controller.signal, progress => report({ type: "progress", progress }))
    .then(() => report({ type: "done" }))
    .catch(error => {
      if (controller.signal.aborted) report({ type: "paused" });
      else {
        report({ type: "error", reason: error instanceof DOMException && error.name === "QuotaExceededError" ? "storage" : "network" });
      }
    }).finally(() => {
      active = undefined;
      scope.close();
    });
};
