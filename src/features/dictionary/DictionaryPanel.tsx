"use client";

import { useEffect, useState } from "react";
import { Button } from "@/design-system/components/Button";
import { Heading } from "@/design-system/components/Heading";
import { Link } from "@/design-system/components/Link";
import { Notice } from "@/design-system/components/Notice";
import { Sheet } from "@/design-system/components/Sheet";
import { Text } from "@/design-system/components/Text";
import { lookupDictionary, type DictionaryLanguage } from "@/lib/dictionary/lookup";
import { isOnline } from "@/lib/online";
import { messages } from "@/lib/messages/pt-br";
import styles from "./dictionary.module.css";

type Result = Awaited<ReturnType<typeof lookupDictionary>>;
type Props = { word: string; language: DictionaryLanguage; close: () => void };

export function DictionaryPanel({ word, language, close }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Result | "offline" | "error">();
  const { dictionary } = messages;

  useEffect(() => {
    let active = true;
    void lookupDictionary(language, word).then(result => {
      if (active) setState(result);
    }).catch(() => {
      if (active) setState(isOnline() ? "error" : "offline");
    });
    return () => { active = false; };
  }, [attempt, language, word]);

  const isError = state === "offline" || state === "error";
  const origin = language === "pt" ? "https://pt.wiktionary.org/wiki/" : "https://en.wiktionary.org/wiki/";

  const results = Array.isArray(state) ? state : [];
  const displayed = expanded ? results : results.slice(0, 1);
  const canExpand = results.length > 1 || (results[0]?.definitions.length ?? 0) > 2;

  return (
    <Sheet variant="compact" title={word} closeLabel={dictionary.close} onClose={close}>
      <div className={styles.lookup}>
        <span className={styles.language}>{dictionary.languages[language]}</span>
        {isError && <div>
          <Notice>{dictionary[state]}</Notice>
          <Link href="/dicionarios">{dictionary.offlineTitle}</Link>
          <Button variant="quiet" onClick={() => { setState(undefined); setAttempt(value => value + 1); }}>
            {dictionary.retry}
          </Button>
        </div>}
        {Array.isArray(state) && state.length === 0 && <Text>{dictionary.empty}</Text>}
        {displayed.map(entry => (
          <section className={styles.panel} key={entry.word}>
            {entry.word !== word && <Heading as="h3">{entry.word}</Heading>}
            <ol className={styles.definitions} role="list">
              {(expanded ? entry.definitions : entry.definitions.slice(0, 2)).map(({ text, pos }, index) => (
                <li className={styles.definition} key={index}>
                  {Object.hasOwn(dictionary.pos, pos) && (
                    <span className={styles.partOfSpeech}>{dictionary.pos[pos as keyof typeof dictionary.pos]}</span>
                  )}
                  <Text variant="reading"><span lang={language}>{text}</span></Text>
                </li>
              ))}
            </ol>
            <div className={styles.links}>
              <Link tone="muted" href={origin + encodeURIComponent(entry.word)} target="_blank" rel="noreferrer">{dictionary.wiktionary}</Link>
            </div>
          </section>
        ))}
        {canExpand && !expanded && <div className={styles.more}>
          <Button variant="quiet" onClick={() => setExpanded(true)}>{dictionary.more}</Button>
        </div>}
      </div>
    </Sheet>
  );
}
