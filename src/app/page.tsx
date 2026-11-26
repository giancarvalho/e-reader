import { Text } from "@/design-system/components/Text";
import { messages } from "@/lib/messages/pt-br";
import { EnterLink } from "./EnterLink";
import { ThemeToggle } from "./ThemeToggle";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={`${styles.shell} ${styles.home}`}>
      <ThemeToggle />
      <div className={styles.intro}>
        <h1 className={styles.title}>{messages.title}</h1>
        <Text variant="reading" tone="muted">{messages.home.subtitle}</Text>
        <EnterLink />
      </div>
      <footer className={styles.credits}><a href="/creditos">{messages.home.credits}</a></footer>
    </main>
  );
}
