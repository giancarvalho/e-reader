import { Link } from "@/design-system/components/Link";
import { messages } from "@/lib/messages/pt-br";
import styles from "../page.module.css";

export default function Credits() {
  const { dictionary, home, auth } = messages;
  return <main className={styles.shell}><article className={styles.intro}>
    <h1>{home.credits}</h1>
    <h2>{dictionary.wiktionary}</h2>
    <p>{dictionary.source}</p>
    <p>{home.creditsDictionary}</p>
    <p><Link variant="inline" href="https://pt.wiktionary.org/">{home.wiktionaryPortuguese}</Link> · <Link variant="inline" href="https://en.wiktionary.org/">{home.wiktionaryEnglish}</Link></p>
    <p><Link variant="inline" href="https://kaikki.org/">Kaikki</Link> · <Link variant="inline" href="https://github.com/tatuylonen/wiktextract">Wiktextract</Link></p>
    <p><Link variant="inline" href="https://creativecommons.org/licenses/by-sa/4.0/">{dictionary.license}</Link></p>
    <p><Link variant="inline" href="https://github.com/johnfactotum/foliate-js/blob/main/LICENSE">{home.foliateLicense}</Link></p>
    <Link href="/" client>{auth.back}</Link>
  </article></main>;
}
