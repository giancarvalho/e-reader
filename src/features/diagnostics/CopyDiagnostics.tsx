"use client";

import { Button } from "@/design-system/components/Button";
import { Notice } from "@/design-system/components/Notice";
import { Sheet } from "@/design-system/components/Sheet";
import { TextArea } from "@/design-system/components/TextArea";
import { deviceEnvironment, formatDiagnosticReport, readGestureLog, type GestureData } from "@/lib/gesture-log";
import { messages } from "@/lib/messages/pt-br";
import { useCopyText } from "@/lib/use-copy-text";
import styles from "./diagnostics.module.css";

/** Copies what is needed to investigate a problem on a real device: app status, device and touch log. */
export function CopyDiagnostics({ status }: { status: GestureData }) {
  const { copy, copied, fallback, dismiss } = useCopyText();
  const { diagnostics, reader } = messages;

  return (
    <div className={styles.copy}>
      <Button
        variant="secondary"
        onClick={() => void copy(formatDiagnosticReport(status, readGestureLog(), deviceEnvironment()))}
      >
        {diagnostics.copy}
      </Button>
      <Notice>{copied ? diagnostics.copied : undefined}</Notice>
      {fallback && <Sheet title={diagnostics.title} closeLabel={reader.closePanel} onClose={dismiss}>
        <TextArea label={diagnostics.copyField} readOnly rows={12} value={fallback} onFocus={event => event.target.select()} />
      </Sheet>}
    </div>
  );
}
