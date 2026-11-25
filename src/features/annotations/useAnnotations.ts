"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReaderIdentity } from "@/lib/books/local";
import { createAnnotationStore } from "@/lib/sync/annotation-store";
import { syncAnnotations, type Annotation } from "@/lib/sync/annotations";
import { pullAnnotations, pushAnnotation } from "./actions";

type SyncStatus = "idle" | "offline" | "syncing" | "error";

export function useAnnotations(identity: ReaderIdentity) {
  const store = useMemo(() => createAnnotationStore([identity.user, identity.group, identity.hash]), [identity]);
  const [rows, setRows] = useState<Annotation[]>([]);
  const [status, setStatus] = useState<SyncStatus>("idle");
  const busy = useRef(false);
  const delay = useRef(0);
  const retryAfter = useRef(0);

  const sync = useCallback(async () => {
    if (!navigator.onLine) {
      setStatus("offline");
      return;
    }
    if (busy.current) return;
    busy.current = true;
    const run = async () => {
      setStatus("syncing");
      try {
        await syncAnnotations(store, {
          send: async row => {
            const reply = await pushAnnotation(identity, row);
            if (!reply) throw new Error("Unable to send annotation");
            return reply;
          },
          read: async cursor => {
            const page = await pullAnnotations(identity, cursor);
            if (!page) throw new Error("Unable to load annotations");
            return page;
          },
        });
        delay.current = 0;
        retryAfter.current = 0;
        setStatus("idle");
      } catch {
        delay.current = Math.min(delay.current ? delay.current * 2 : 2_000, 60_000);
        retryAfter.current = Date.now() + delay.current;
        setStatus(navigator.onLine ? "error" : "offline");
      } finally {
        await store.list().then(setRows).catch(() => setStatus("error"));
      }
    };
    try {
      if (navigator.locks) {
        await navigator.locks.request(`e-reader:${identity.user}:${identity.group}:${identity.hash}`, run);
      } else await run();
    } finally {
      busy.current = false;
    }
  }, [identity, store]);

  useEffect(() => {
    void store.list().then(setRows).catch(() => setStatus("error"));
    const reconnect = () => { void sync().catch(() => setStatus("error")); };
    const disconnect = () => setStatus("offline");
    const check = () => {
      if (document.visibilityState === "visible" && Date.now() >= retryAfter.current) reconnect();
    };
    reconnect();
    const timer = window.setInterval(check, 10_000);
    window.addEventListener("online", reconnect);
    window.addEventListener("offline", disconnect);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", reconnect);
      window.removeEventListener("offline", disconnect);
      document.removeEventListener("visibilitychange", check);
    };
  }, [store, sync]);

  async function save(row: Annotation) {
    try {
      await store.save(row);
      setRows(await store.list());
      void sync().catch(() => setStatus("error"));
      return true;
    } catch {
      setStatus("error");
      return false;
    }
  }

  return { rows, status, save, retry: sync };
}
