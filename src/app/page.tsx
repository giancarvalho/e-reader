import { Heading } from "@/design-system/components/Heading";
import { Text } from "@/design-system/components/Text";
import { messages } from "@/lib/messages/pt-br";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.shell}>
      <Heading>{messages.title}</Heading>
      <Text tone="muted">{messages.shellStatus}</Text>
    </main>
  );
}
