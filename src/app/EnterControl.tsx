"use client";

import { useSyncExternalStore } from "react";
import { signInWithGoogle } from "@/features/auth/actions";
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

export function EnterControl() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (!online) {
    // Document navigation also works from the precached homepage.
    return <a className={styles.enter} href="/estante-offline">{messages.home.enter}</a>;
  }
  return (
    <form action={signInWithGoogle}>
      <button className={styles.enter} type="submit">{messages.home.enter}</button>
    </form>
  );
}
