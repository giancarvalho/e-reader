"use client";

import { useSyncExternalStore, type SubmitEvent } from "react";
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

  function openOfflineShelf(event: SubmitEvent<HTMLFormElement>) {
    if (navigator.onLine) return;
    event.preventDefault();
    window.location.assign("/estante-offline");
  }

  return (
    <form action={online ? signInWithGoogle : "/estante-offline"} onSubmit={openOfflineShelf}>
      <button className={styles.enter} type="submit">{messages.home.enter}</button>
    </form>
  );
}
