"use client";

import type { ReaderIdentity } from "@/lib/books/local";
import { useBookSync } from "@/lib/sync/use-book-sync";
import { pullComments, pushComment } from "./actions";

const transport = { send: pushComment, read: pullComments };

export function useComments(identity: ReaderIdentity) {
  return useBookSync(identity, "e-reader-comments", transport);
}
