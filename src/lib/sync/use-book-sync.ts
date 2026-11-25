"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { recordDiagnostic } from "../diagnostics";
import type { ReaderIdentity } from "../books/local";
import { createBookSyncStore } from "./annotation-store";
import { syncAnnotations, type AnnotationCursor, type RemoteRow, type SyncRow } from "./annotations";

type SyncStatus = "idle" | "offline" | "syncing" | "error";

export function useBookSync<Row extends SyncRow>(
  identity: ReaderIdentity,
  database: "e-reader-annotations" | "e-reader-comments",
  transport: {
    send(identity: ReaderIdentity, row: Row): Promise<RemoteRow<Row> | null>;
    read(identity: ReaderIdentity, cursor: AnnotationCursor | null): Promise<RemoteRow<Row>[] | null>;
  },
) {
  const store = useMemo(() => createBookSyncStore<Row>(database, [identity.user, identity.group, identity.hash]), [database, identity]);
  const [rows, setRows] = useState<Row[]>([]);
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
      const system = database === "e-reader-annotations" ? "annotations" : "comments";
      setStatus("syncing");
      try {
        await syncAnnotations(store, {
          send: async row => {
            const reply = await transport.send(identity, row);
            if (!reply) throw new Error("Unable to send queued change");
            return reply;
          },
          read: async cursor => {
            const page = await transport.read(identity, cursor);
            if (!page) throw new Error("Unable to load changes");
            return page;
          },
        });
        delay.current = 0;
        retryAfter.current = 0;
        setStatus("idle");
        recordDiagnostic(system, "ok");
      } catch {
        delay.current = Math.min(delay.current ? delay.current * 2 : 2_000, 60_000);
        retryAfter.current = Date.now() + delay.current;
        setStatus(navigator.onLine ? "error" : "offline");
        if (navigator.onLine) recordDiagnostic(system, "error");
      } finally {
        await store.list().then(setRows).catch(() => setStatus("error"));
      }
    };
    try {
      if (navigator.locks) {
        await navigator.locks.request(`${database}:${identity.user}:${identity.group}:${identity.hash}`, run);
      } else await run();
    } finally {
      busy.current = false;
    }
  }, [database, identity, store, transport]);

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

  async function save(row: Row) {
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
