"use client";

import { useEffect, useState } from "react";
import { Button } from "@/design-system/components/Button";
import { Heading } from "@/design-system/components/Heading";
import { Sheet } from "@/design-system/components/Sheet";
import { Text } from "@/design-system/components/Text";
import { lookupDictionary, type DictionaryLanguage } from "@/lib/dictionary/lookup";
import { messages } from "@/lib/messages/pt-br";
import styles from "./dictionary.module.css";

type Result = Awaited<ReturnType<typeof lookupDictionary>>;
type Props = { word: string; language: DictionaryLanguage; close: () => void };

export function DictionaryPanel({ word, language, close }: Props) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Result | "offline" | "error">();
  const { dictionary } = messages;


  useEffect(() => {
    let active = true;
    void lookupDictionary(language, word).then(result => {
      if (active) setState(result);
    }).catch(() => {
      if (active) setState(navigator.onLine ? "error" : "offline");
    });
    return () => { active = false; };
  }, [attempt, language, word]);

  const isError = state === "offline" || state === "error";
  const origin = language === "pt" ? "https://pt.wiktionary.org/wiki/" : "https://en.wiktionary.org/wiki/";

  return (
    <Sheet title={word} onClose={close}>
        <Text tone="muted">{dictionary.languages[language]}</Text>
        {state === undefined && <div role="status"><Text>{dictionary.loading}</Text></div>}
        {isError && <div role="status">
          <Text>{dictionary[state]}</Text>
          <Button variant="quiet" onClick={() => { setState(undefined); setAttempt(value => value + 1); }}>
            {dictionary.retry}
          </Button>
        </div>}
        {Array.isArray(state) && state.length === 0 && <Text>{dictionary.empty}</Text>}
        {Array.isArray(state) && state.map(entry => (
          <section className={styles.panel} key={entry.word}>
            <Heading as="h3">{entry.word}</Heading>
            {entry.word !== word && <Text tone="muted">{dictionary.inText} {word}</Text>}
            <ol className={styles.definitions}>
              {entry.definitions.map(({ text, pos }, index) => (
                <li key={index}>
                  {Object.hasOwn(dictionary.pos, pos) && (
                    <Text tone="muted">{dictionary.pos[pos as keyof typeof dictionary.pos]}</Text>
                  )}
                  <p lang={language}>{text}</p>
                </li>
              ))}
            </ol>
            <Text tone="muted">{dictionary.source}</Text>
            <div className={styles.links}>
              <a href={origin + encodeURIComponent(entry.word)} target="_blank" rel="noreferrer">{dictionary.wiktionary}</a>
              <a href={origin + encodeURIComponent(entry.word) + "?action=history"} target="_blank" rel="noreferrer">{dictionary.history}</a>
              <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">{dictionary.license}</a>
            </div>
          </section>
        ))}
        <Button variant="quiet" onClick={close}>{dictionary.close}</Button>
    </Sheet>
  );
}
