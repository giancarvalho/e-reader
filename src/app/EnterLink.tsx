"use client";

import { useEffect, useSyncExternalStore } from "react";
import { normalizeInviteCode } from "@/lib/access/invite";
import { messages } from "@/lib/messages/pt-br";
import styles from "./page.module.css";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

export function EnterLink() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  const invite = useSyncExternalStore(() => () => {}, () => normalizeInviteCode(new URLSearchParams(window.location.search).get("invite")), () => undefined);
  useEffect(() => {
    if (!online || !invite) return;
    const controller = new AbortController();
    void fetch("/auth/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: invite }), signal: controller.signal })
      .then(async response => { if (response.ok) { const { path } = await response.json(); if (!controller.signal.aborted && (path === "/estante" || path.startsWith("/convite?"))) window.location.replace(path); } })
      .catch(() => undefined);
    return () => controller.abort();
  }, [online, invite]);
  // Document navigation also works from the precached homepage.
  return <a className={styles.enter} href={online ? (invite ? `/auth/google/start?codigo=${encodeURIComponent(invite)}` : "/auth/google/start") : "/estante-offline"}>{messages.home.enter}</a>;
}
