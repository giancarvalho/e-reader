"use client";

import { useSyncExternalStore } from "react";
import { installKind, type InstallKind } from "./detect";

export type { InstallKind } from "./detect";

type PromptEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const seenKey = "install-hint-seen";
const listeners = new Set<() => void>();
let prompt: PromptEvent | undefined;
let installed = false;
let seenInMemory = false;
let capturing = false;

function emit() {
  for (const listener of listeners) listener();
}

/** Keeps the browser's install prompt for later: the event fires once, often before any screen asks for it. */
export function captureInstallPrompt() {
  if (capturing || typeof window === "undefined") return;
  capturing = true;
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    prompt = event as PromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    prompt = undefined;
    emit();
  });
}

function running() {
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return standalone || ["standalone", "fullscreen", "minimal-ui"].some(mode =>
    window.matchMedia?.(`(display-mode: ${mode})`).matches);
}

function hintSeen() {
  try {
    return seenInMemory || localStorage.getItem(seenKey) === "1";
  } catch {
    return seenInMemory;
  }
}

function snapshot() {
  const kind = installed ? "installed" : installKind({
    userAgent: navigator.userAgent, maxTouchPoints: navigator.maxTouchPoints, standalone: running(),
  });
  return `${kind}|${prompt ? 1 : 0}|${hintSeen() ? 1 : 0}`;
}

function subscribe(listener: () => void) {
  captureInstallPrompt();
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** Shows the install hint only once per device. */
export function markInstallHintSeen() {
  seenInMemory = true;
  try {
    localStorage.setItem(seenKey, "1");
  } catch {
    // Without storage the hint can reappear on the next visit, which is harmless.
  }
  emit();
}

/** Opens the browser's native install prompt (Android). Resolves to whether the person accepted. */
export async function promptInstall() {
  const event = prompt;
  if (!event) return false;
  prompt = undefined;
  emit();
  await event.prompt();
  return (await event.userChoice).outcome === "accepted";
}

export function useInstall() {
  // The server snapshot reads as "seen" so that nothing is rendered before the browser is known.
  const [kind, canPrompt, seen] = useSyncExternalStore(subscribe, snapshot, () => "none|0|1").split("|");
  return {
    kind: kind as InstallKind,
    canPrompt: canPrompt === "1",
    seen: seen === "1",
    install: promptInstall,
    markSeen: markInstallHintSeen,
  };
}
