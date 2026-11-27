"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

/** Whether the browser reports a network connection. Treated as online on the server. */
export function isOnline() {
  return typeof navigator === "undefined" || navigator.onLine;
}

/** Calls `callback` each time the connection comes back. Returns the cleanup. */
export function onReconnect(callback: () => void) {
  window.addEventListener("online", callback);
  return () => window.removeEventListener("online", callback);
}

/** Calls `callback` each time the connection is lost. Returns the cleanup. */
export function onDisconnect(callback: () => void) {
  window.addEventListener("offline", callback);
  return () => window.removeEventListener("offline", callback);
}

/** Calls `callback` whenever the connection comes back or is lost. Returns the cleanup. */
export function onConnectivityChange(callback: () => void) {
  const stopReconnect = onReconnect(callback);
  const stopDisconnect = onDisconnect(callback);
  return () => {
    stopReconnect();
    stopDisconnect();
  };
}

/** The current connection state, kept in sync with the browser. */
export function useOnline() {
  return useSyncExternalStore(onConnectivityChange, isOnline, () => true);
}

/** Runs the latest `callback` each time the connection comes back, without resubscribing. */
export function useOnReconnect(callback: () => void) {
  const latest = useRef(callback);
  useEffect(() => { latest.current = callback; });
  useEffect(() => onReconnect(() => latest.current()), []);
}
