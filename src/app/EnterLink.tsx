"use client";

import { useEffect, useSyncExternalStore } from "react";
import { LinkButton } from "@/design-system/components/LinkButton";
import { Notice } from "@/design-system/components/Notice";
import { useOnline } from "@/lib/online";
import { invitePath, normalizeInviteCode } from "@/lib/access/invite";
import { messages } from "@/lib/messages/pt-br";

export function EnterLink() {
  const online = useOnline();
  const rawInvite = useSyncExternalStore(() => () => {}, () => new URLSearchParams(window.location.search).get("invite"), () => null);
  const invite = normalizeInviteCode(rawInvite);
  useEffect(() => {
    if (!online || !invite) return;
    const controller = new AbortController();
    async function join(code: string) {
      try {
        const response = await fetch("/auth/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
          signal: controller.signal,
        });
        if (response.status === 401 || controller.signal.aborted) return;
        if (response.ok) {
          const { path } = await response.json();
          if (!controller.signal.aborted && typeof path === "string" && (path === "/estante" || path.startsWith("/convite?"))) {
            window.location.replace(path);
            return;
          }
        }
      } catch {
        // Preserve the code so the reader can retry after reconnecting.
      }
      if (!controller.signal.aborted) window.location.replace(invitePath(code, "unavailable"));
    }
    void join(invite);
    return () => controller.abort();
  }, [online, invite]);
  // Document navigation also works from the precached homepage.
  const destination = invite ? `/auth/google/start?codigo=${encodeURIComponent(invite)}` : "/auth/google/start";
  return <>
    {rawInvite !== null && !invite && <Notice>{messages.access.errors.invalid_code}</Notice>}
    {invite && !online && <Notice>{messages.access.errors.unavailable}</Notice>}
    <LinkButton href={online ? destination : "/estante-offline"}>{messages.home.enter}</LinkButton>
  </>;
}
