"use client";
import { Button } from "@/design-system/components/Button";
import { messages } from "@/lib/messages/pt-br";
import styles from "./page.module.css";

export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = getComputedStyle(root).colorScheme === "dark" ? "day" : "night";
    root.dataset.theme = next;
    try { localStorage.setItem("app-theme", next); } catch { /* Theme still applies for this page. */ }
  }
  return <div className={styles.theme}><Button variant="icon" aria-label={messages.home.toggleTheme} onClick={toggle}>
    <svg data-icon="sun" aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>
    <svg data-icon="moon" aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z"/></svg>
  </Button></div>;
}
