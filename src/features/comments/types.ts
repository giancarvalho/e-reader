import type { SyncRow } from "@/lib/sync/annotations";

export type Comment = SyncRow & {
  annotation_id: string;
  text: string;
  created_at: string;
  name?: string | null;
  avatar?: string | null;
};
