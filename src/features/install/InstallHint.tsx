"use client";

import { Button } from "@/design-system/components/Button";
import { Sheet } from "@/design-system/components/Sheet";
import { useInstall } from "@/lib/install";
import { messages } from "@/lib/messages/pt-br";
import { InstallGuide } from "./InstallGuide";
import styles from "./install.module.css";

/** Shown once per device, in the browser only, the first time the shelf opens after signing in. */
export function InstallHint() {
  const { kind, canPrompt, seen, install, markSeen } = useInstall();
  if (seen || kind === "installed" || kind === "none") return null;

  return (
    <Sheet title={messages.install.title} closeLabel={messages.reader.closePanel} onClose={markSeen}>
      <div className={styles.guide}>
        <InstallGuide kind={kind} canPrompt={canPrompt} onInstall={() => void install().then(markSeen)} />
        <div className={styles.actions}>
          <Button variant="quiet" onClick={markSeen}>{messages.install.notNow}</Button>
        </div>
      </div>
    </Sheet>
  );
}
