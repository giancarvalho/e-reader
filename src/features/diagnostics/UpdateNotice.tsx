"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/design-system/components/Button";
import { Page } from "@/design-system/components/Page";
import { StatusBanner } from "@/design-system/components/StatusBanner";
import { messages } from "@/lib/messages/pt-br";

export function UpdateNotice() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [applying, setApplying] = useState(false);
  const requested = useRef(false);
  const { diagnostics } = messages;

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let active = true;
    let registration: ServiceWorkerRegistration | undefined;
    let installer: ServiceWorker | null = null;
    const workers = navigator.serviceWorker;

    function inspect() {
      if (active && registration?.waiting && workers.controller) setWaiting(registration.waiting);
    }
    function found() {
      if (installer) installer.removeEventListener("statechange", inspect);
      installer = registration?.installing ?? null;
      installer?.addEventListener("statechange", inspect);
      inspect();
    }
    function changed() {
      if (requested.current) window.location.reload();
      else setWaiting(null);
    }

    workers.addEventListener("controllerchange", changed);
    void workers.ready.then(current => {
      if (!active) return;
      registration = current;
      registration.addEventListener("updatefound", found);
      found();
    }).catch(() => undefined);
    return () => {
      active = false;
      workers.removeEventListener("controllerchange", changed);
      registration?.removeEventListener("updatefound", found);
      installer?.removeEventListener("statechange", inspect);
    };
  }, []);

  if (!waiting) return null;
  return (
    <Page as="div" variant="banner">
      <StatusBanner action={<Button loading={applying} onClick={() => {
        requested.current = true;
        setApplying(true);
        waiting.postMessage({ type: "SKIP_WAITING" });
      }}>{diagnostics.update}</Button>}>
        {diagnostics.updateAvailable}
      </StatusBanner>
    </Page>
  );
}
