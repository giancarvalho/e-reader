"use client";

import { useState } from "react";

// Copies text and, when the browser refuses (some iOS contexts), exposes it for manual selection.
export function useCopyText() {
  const [copied, setCopied] = useState(false);
  const [fallback, setFallback] = useState<string>();

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setFallback(undefined);
      setCopied(true);
    } catch {
      setCopied(false);
      setFallback(value);
    }
  }

  return { copy, copied, fallback, dismiss: () => setFallback(undefined), reset: () => setCopied(false) };
}
