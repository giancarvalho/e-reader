"use client";

import { useSyncExternalStore } from "react";
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
  // Document navigation also works from the precached homepage.
  return <a className={styles.enter} href={online ? "/convite" : "/estante-offline"}>{messages.home.enter}</a>;
}
