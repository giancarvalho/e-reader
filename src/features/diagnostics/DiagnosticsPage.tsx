"use client";

import { useEffect, useState } from "react";
import { Heading } from "@/design-system/components/Heading";
import { Text } from "@/design-system/components/Text";
import { observeDiagnostics, readDiagnostics } from "@/lib/diagnostics";
import { messages } from "@/lib/messages/pt-br";
import styles from "./diagnostics.module.css";

export function DiagnosticsPage() {
  const [online, setOnline] = useState<boolean>();
  const [worker, setWorker] = useState(false);
  const [snapshot, setSnapshot] = useState<ReturnType<typeof readDiagnostics>>();
  const { diagnostics } = messages;

  useEffect(() => {
    const update = () => {
      setOnline(navigator.onLine);
      setWorker(Boolean(navigator.serviceWorker?.controller));
    };
    const refresh = () => setSnapshot(readDiagnostics());
    const unsubscribe = observeDiagnostics(refresh);
    update();
    refresh();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    navigator.serviceWorker?.addEventListener("controllerchange", update);
    return () => {
      unsubscribe();
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      navigator.serviceWorker?.removeEventListener("controllerchange", update);
    };
  }, []);

  const version = process.env.NEXT_PUBLIC_APP_VERSION || diagnostics.local;
  const time = (value: string) => new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short", timeStyle: "short",
  }).format(new Date(value));
  return (
    <main className={styles.page}>
      <Heading>{diagnostics.title}</Heading>
      <dl className={styles.summary}>
        <dt>{diagnostics.version}</dt><dd>{version}</dd>
        {online !== undefined && <>
          <dt>{diagnostics.network}</dt><dd>{online ? diagnostics.connected : diagnostics.disconnected}</dd>
          <dt>{diagnostics.worker}</dt><dd>{worker ? diagnostics.active : diagnostics.inactive}</dd>
        </>}
        {Object.values(snapshot?.last ?? {}).map(entry => (
          <div key={entry.system}>
            <dt>{diagnostics.systems[entry.system]}</dt>
            <dd>{diagnostics.states[entry.state]} · {time(entry.time)}</dd>
          </div>
        ))}
      </dl>
      <Heading as="h2">{diagnostics.errors}</Heading>
      {snapshot?.errors.length ? <ul>
        {snapshot.errors.map(entry => <li key={`${entry.system}:${entry.time}`}>
          {diagnostics.systems[entry.system]} · {time(entry.time)}
        </li>)}
      </ul> : <Text>{diagnostics.empty}</Text>}
      <a href="/estante">{messages.reader.shelf}</a>
    </main>
  );
}
