"use client";

import { useState } from "react";
import { Button } from "@/design-system/components/Button";
import { ColorField } from "@/design-system/components/ColorField";
import { Text } from "@/design-system/components/Text";
import { contrastRatio, type ReaderPreferences } from "@/lib/reader/model";
import { messages } from "@/lib/messages/pt-br";
import styles from "./reader.module.css";

const sepia = { background: "#EFDFC2", ink: "#39271C" };

export function ReaderAppearance({ preferences, change }: {
  preferences: ReaderPreferences; change: (value: ReaderPreferences) => void;
}) {
  const { reader } = messages;
  // Sepia is stored as a custom theme with fixed colors, so choosing "custom" from sepia keeps the same colors.
  const [choseCustom, setChoseCustom] = useState(false);
  const theme = preferences.theme === "custom" && !choseCustom && preferences.background === sepia.background && preferences.ink === sepia.ink
    ? "sepia" : preferences.theme;
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
          {(["auto", "day", "sepia", "night", "custom"] as const).map(value => <Button key={value}
            variant={theme === value ? "primary" : "secondary"} aria-pressed={theme === value}
            onClick={() => {
              setChoseCustom(value === "custom");
              change(value === "sepia" ? { ...preferences, ...sepia, theme: "custom" } : { ...preferences, theme: value });
            }}>
            {reader[value]}
          </Button>)}
        </div>
      </fieldset>
      {theme === "custom" && <>
        <ColorField label={reader.background} value={preferences.background}
          onChange={event => change({ ...preferences, background: event.target.value })} />
        <ColorField label={reader.ink} value={preferences.ink}
          onChange={event => change({ ...preferences, ink: event.target.value })} />
        {contrastRatio(preferences.background, preferences.ink) < 4.5 && <Text>{reader.lowContrast}</Text>}
      </>}
    </div>
  );
}
