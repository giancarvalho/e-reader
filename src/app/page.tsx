import { messages } from "@/lib/messages/pt-br";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.shell}>
      <h1>{messages.title}</h1>
      <p>{messages.shellStatus}</p>
    </main>
  );
}
