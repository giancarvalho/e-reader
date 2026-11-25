import { Text } from "@/design-system/components/Text";
import { messages } from "@/lib/messages/pt-br";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.shell}>
      <div className={styles.intro}>
        <h1 className={styles.title}>{messages.title}</h1>
        <Text variant="reading" tone="muted">{messages.home.subtitle}</Text>
        {/* Use document navigation so the service worker can open the offline shelf. */}
        <a className={styles.enter} href="/convite">{messages.home.enter}</a>
      </div>
    </main>
  );
}
