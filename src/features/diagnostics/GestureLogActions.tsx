"use client";

import { useEffect, useState } from "react";
import { Button } from "@/design-system/components/Button";
import { Notice } from "@/design-system/components/Notice";
import { Sheet } from "@/design-system/components/Sheet";
import { Text } from "@/design-system/components/Text";
import { TextArea } from "@/design-system/components/TextArea";
import { clearGestureLog, formatGestureReport, gestureEnvironment, readGestureLog } from "@/lib/gesture-log";
import { messages } from "@/lib/messages/pt-br";
import { useCopyText } from "@/lib/use-copy-text";
import styles from "./diagnostics.module.css";

export function GestureLogActions() {
  const { copy, copied, fallback, dismiss, reset } = useCopyText();
  const [count, setCount] = useState<number>();
  const [cleared, setCleared] = useState(false);
  const { gestures } = messages.diagnostics;

  useEffect(() => {
    const refresh = () => setCount(readGestureLog().length);
    const frame = window.requestAnimationFrame(refresh);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div className={styles.gestureLog}>
      <Text tone="muted">{gestures.hint}</Text>
      {count !== undefined && <Text>{count ? `${count} ${gestures.events}` : gestures.none}</Text>}
      <div className={styles.gestureActions}>
        <Button
          variant="secondary"
          disabled={!count}
          onClick={() => {
            setCleared(false);
            void copy(formatGestureReport(readGestureLog(), gestureEnvironment()));
          }}
        >
          {gestures.copy}
        </Button>
        <Button
          variant="quiet"
          disabled={!count}
          onClick={() => {
            clearGestureLog();
            setCount(0);
            reset();
            setCleared(true);
          }}
        >
          {gestures.clear}
        </Button>
      </div>
      <Notice>{copied ? gestures.copied : cleared ? gestures.cleared : undefined}</Notice>
      {fallback && <Sheet title={gestures.title} closeLabel={messages.reader.closePanel} onClose={dismiss}>
        <TextArea label={gestures.field} readOnly rows={12} value={fallback} onFocus={event => event.target.select()} />
      </Sheet>}
    </div>
  );
}
