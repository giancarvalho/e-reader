import { Heading } from "@/design-system/components/Heading";
import { Link } from "@/design-system/components/Link";
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
        <Heading variant="display">{messages.title}</Heading>
        <Text variant="reading" tone="muted">{messages.home.subtitle}</Text>
        <EnterLink />
      </div>
      <footer className={styles.credits}><Link href="/creditos" tone="muted">{messages.home.credits}</Link></footer>
    </main>
  );
}
