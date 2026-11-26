"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/design-system/components/Button";
import { Heading } from "@/design-system/components/Heading";
import { Notice } from "@/design-system/components/Notice";
import { Progress } from "@/design-system/components/Progress";
import { Text } from "@/design-system/components/Text";
import type { DictionaryLanguage } from "@/lib/dictionary/catalog";
import type { DictionaryDownloadMessage, DictionaryProgress } from "@/lib/dictionary/offline-download";
import { hasDownloadedShards, installedCatalog, removeOfflineDictionary } from "@/lib/dictionary/offline-store";
import { messages } from "@/lib/messages/pt-br";
import styles from "./dictionary.module.css";

const languages = ["pt", "en"] as const;
type LocalState = { installed: boolean; partial: boolean };
type Message = "installed" | "paused" | "storage" | "downloadFailed" | "removed" | "removeFailed";

async function readLocal() {
  const states = await Promise.all(languages.map(async language => {
    const [catalog, partial] = await Promise.all([installedCatalog(language), hasDownloadedShards(language)]);
    return [language, { installed: Boolean(catalog), partial }] as const;
  }));
  return Object.fromEntries(states) as Record<DictionaryLanguage, LocalState>;
}

export function OfflineDictionaries() {
  const worker = useRef<Worker>(null);
  const [local, setLocal] = useState<Awaited<ReturnType<typeof readLocal>>>();
  const [busy, setBusy] = useState<{ language: DictionaryLanguage; action: "download" | "remove" }>();
  const [progress, setProgress] = useState<DictionaryProgress>();
  const [pausing, setPausing] = useState(false);
  const [message, setMessage] = useState<{ language: DictionaryLanguage; key: Message }>();
  const { dictionary } = messages;

  useEffect(() => {
    let active = true;
    void readLocal().then(value => { if (active) setLocal(value); }).catch(() => undefined);
    return () => { active = false; worker.current?.terminate(); worker.current = null; };
  }, []);

  async function refresh() {
    await readLocal().then(setLocal).catch(() => undefined);
  }

  function download(language: DictionaryLanguage) {
    if (busy || worker.current) return;
    setMessage(undefined);
    setProgress(undefined);
    setBusy({ language, action: "download" });
    function finish(key: Message) {
      worker.current?.terminate();
      worker.current = null;
      setMessage({ language, key });
      setPausing(false);
      setBusy(undefined);
      setProgress(undefined);
      void refresh();
    }

    try {
      const instance = new Worker(new URL("../../lib/dictionary/offline-worker.ts", import.meta.url));
      worker.current = instance;
      instance.onmessage = ({ data }: MessageEvent<DictionaryDownloadMessage>) => {
        switch (data.type) {
          case "progress": setProgress(data.progress); break;
          case "done": finish("installed"); break;
          case "paused": finish("paused"); break;
          case "error": finish(data.reason === "storage" ? "storage" : "downloadFailed"); break;
        }
      };
      instance.onerror = () => finish("downloadFailed");
      instance.postMessage({ language });
      void navigator.storage.persist?.().catch(() => false);
    } catch {
      finish("downloadFailed");
    }
  }

  async function remove(language: DictionaryLanguage) {
    if (busy) return;
    setBusy({ language, action: "remove" });
    try {
      await removeOfflineDictionary(language);
      await refresh();
      setMessage({ language, key: "removed" });
    } catch {
      setMessage({ language, key: "removeFailed" });
    } finally {
      setBusy(undefined);
    }
  }

  return languages.map(language => {
    const info = local?.[language];
    const label = dictionary.languages[language];
    const downloading = busy?.language === language && busy.action === "download";
    return <section className={styles.pack} key={language}>
      <Heading as="h2">{label}</Heading>
      {info?.installed && (message?.language !== language || message.key !== "installed")
        && <Text tone="muted">{dictionary.installed}</Text>}
      {downloading && progress && <Progress label={label} value={progress.done} max={progress.total}
        valueText={`${Math.floor(100 * progress.done / progress.total)}%`} />}
      {downloading && !progress && <Notice>{dictionary.preparing}</Notice>}
      <div className={styles.links}>
        {downloading
          ? <Button variant="secondary" disabled={pausing} onClick={() => {
            setPausing(true);
            worker.current?.postMessage({ cancel: true });
          }}>{dictionary.pause}</Button>
          : <Button disabled={Boolean(busy)} onClick={() => download(language)}>
            {info?.installed ? dictionary.update : info?.partial ? dictionary.resume : dictionary.download}
          </Button>}
        {(info?.installed || info?.partial) && <Button variant="quiet" disabled={Boolean(busy)}
          onClick={() => void remove(language)}>{dictionary.removePack}</Button>}
      </div>
      {message?.language === language && <Notice>{dictionary[message.key]}</Notice>}
    </section>;
  });
}
