import Link from "next/link";
import { messages } from "@/lib/messages/pt-br";
import styles from "../page.module.css";

export default function Credits() {
  const { dictionary, home, auth } = messages;
  return <main className={styles.shell}><article className={styles.intro}>
    <h1>{home.credits}</h1>
    <h2>{dictionary.wiktionary}</h2>
    <p>{dictionary.source}</p>
    <p>{home.creditsDictionary}</p>
    <p><a href="https://pt.wiktionary.org/">{home.wiktionaryPortuguese}</a> · <a href="https://en.wiktionary.org/">{home.wiktionaryEnglish}</a></p>
    <p><a href="https://kaikki.org/">Kaikki</a> · <a href="https://github.com/tatuylonen/wiktextract">Wiktextract</a></p>
    <p><a href="https://creativecommons.org/licenses/by-sa/4.0/">{dictionary.license}</a></p>
    <p><a href="https://github.com/johnfactotum/foliate-js/blob/main/LICENSE">{home.foliateLicense}</a></p>
    <Link href="/">{auth.back}</Link>
  </article></main>;
}
