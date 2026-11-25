import Image from "next/image";
import Link from "next/link";
import "@fontsource-variable/newsreader/wght-italic.css";
import { Text } from "@/design-system/components/Text";
import { messages } from "@/lib/messages/pt-br";
import styles from "./page.module.css";

export default function Home() {
  const { home } = messages;

  return (
    <main className={styles.shell}>
      <header className={styles.masthead}>
        <Image src="/icons/book-192.png" width={192} height={192} className={styles.mark} alt="" unoptimized />
        <span>{messages.title}</span>
      </header>

      <section className={styles.hero} aria-labelledby="home-title">
        <div className={styles.intro}>
          <h1 id="home-title" className={styles.title}>
            {home.heading} <em>{home.headingEmphasis}</em>
          </h1>
          <Text tone="muted">{home.intro}</Text>
          <div className={styles.actions}>
            <Link className={styles.enter} href="/convite">{home.enter}</Link>
            {/* A document navigation also works from the precached homepage. */}
            <a className={styles.offline} href="/estante-offline">{home.offline}</a>
          </div>
          <Text tone="muted">{home.invite}</Text>
        </div>
        <Image src="/images/livro-aberto.webp" width={1280} height={853} className={styles.art}
          alt="" loading="eager" fetchPriority="high" unoptimized />
      </section>

      <ul className={styles.features}>
        {home.features.map(feature => (
          <li key={feature.title}>
            <h2 className={styles.featureTitle}>{feature.title}</h2>
            <Text tone="muted">{feature.description}</Text>
          </li>
        ))}
      </ul>
    </main>
  );
}
