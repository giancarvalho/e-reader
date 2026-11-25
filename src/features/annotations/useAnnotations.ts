"use client";

import type { ReaderIdentity } from "@/lib/books/local";
import { useBookSync } from "@/lib/sync/use-book-sync";
import { pullAnnotations, pushAnnotation } from "./actions";

const transport = { send: pushAnnotation, read: pullAnnotations };

export function useAnnotations(identity: ReaderIdentity) {
  return useBookSync(identity, "e-reader-annotations", transport);
}
