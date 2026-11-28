"use client";

import { useEffect } from "react";
import { captureInstallPrompt } from "@/lib/install";

/** Starts listening for the browser's install prompt on every page, so no screen misses the one-time event. */
export function InstallCapture() {
  useEffect(() => { captureInstallPrompt(); }, []);
  return null;
}
