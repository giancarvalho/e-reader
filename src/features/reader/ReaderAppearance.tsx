"use client";

import { useState } from "react";
import { Button } from "@/design-system/components/Button";
import { ColorField } from "@/design-system/components/ColorField";
import { Text } from "@/design-system/components/Text";
import { contrastRatio, readerThemes, type ReaderPreferences } from "@/lib/reader/model";
import { enterFullscreen, fullscreenSupported, leaveFullscreen, readFullscreenPreference, saveFullscreenPreference } from "@/lib/fullscreen";
import { messages } from "@/lib/messages/pt-br";
import styles from "./reader.module.css";

export function ReaderAppearance({ preferences, change }: {
  preferences: ReaderPreferences; change: (value: ReaderPreferences) => void;
}) {
  const { reader } = messages;
  const [fullscreen, setFullscreen] = useState(readFullscreenPreference);
  function toggleFullscreen() {
    const next = !fullscreen;
    setFullscreen(next);
    saveFullscreenPreference(next);
    // Turning it on counts as the tap the browser requires, so it enters at once.
    if (next) enterFullscreen();
    else leaveFullscreen();
  }
  function size(value: number) {
    change({ ...preferences, size: Math.min(36, Math.max(12, value)) });
  }

  return (
    <div className={styles.settings}>
      <fieldset>
        <legend>{reader.textSize}</legend>
        <div className={styles.size}>
          <Button variant="secondary" aria-label={reader.smaller} disabled={preferences.size <= 12}
            onClick={() => size(preferences.size - 1)}>A−</Button>
          <output>{preferences.size}</output>
          <Button variant="secondary" aria-label={reader.larger} disabled={preferences.size >= 36}
            onClick={() => size(preferences.size + 1)}>A+</Button>
        </div>
      </fieldset>
      <fieldset>
        <legend>{reader.font}</legend>
        <div className={styles.options}>
          {(["serif", "sans"] as const).map(font => <Button key={font} variant={preferences.font === font ? "primary" : "secondary"}
            aria-pressed={preferences.font === font} onClick={() => change({ ...preferences, font })}>{reader[font]}</Button>)}
        </div>
      </fieldset>
      <fieldset>
        <legend>{reader.theme}</legend>
        <div className={styles.options}>
          {readerThemes.map(value => <Button key={value}
            variant={preferences.theme === value ? "primary" : "secondary"} aria-pressed={preferences.theme === value}
            onClick={() => change({ ...preferences, theme: value })}>
            {reader[value]}
          </Button>)}
        </div>
      </fieldset>
      {fullscreenSupported() && <fieldset>
        <legend>{reader.fullscreen}</legend>
        <div className={styles.options}>
          <Button variant={fullscreen ? "primary" : "secondary"} aria-pressed={fullscreen} onClick={toggleFullscreen}>
            {fullscreen ? reader.fullscreenOn : reader.fullscreenOff}
          </Button>
        </div>
      </fieldset>}
      {preferences.theme === "custom" && <>
        <ColorField label={reader.background} value={preferences.background}
          onChange={event => change({ ...preferences, background: event.target.value })} />
        <ColorField label={reader.ink} value={preferences.ink}
          onChange={event => change({ ...preferences, ink: event.target.value })} />
        {contrastRatio(preferences.background, preferences.ink) < 4.5 && <Text>{reader.lowContrast}</Text>}
      </>}
    </div>
  );
}
