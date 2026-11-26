import { Heading } from "@/design-system/components/Heading";
import { Link } from "@/design-system/components/Link";
import { Text } from "@/design-system/components/Text";
import { OfflineDictionaries } from "@/features/dictionary/OfflineDictionaries";
import { messages } from "@/lib/messages/pt-br";
import styles from "@/features/dictionary/dictionary.module.css";

export default function DictionariesPage() {
  const { dictionary, reader } = messages;
  return (
    <main className={styles.page}>
      <Link href="/estante">{reader.shelf}</Link>
      <Heading>{dictionary.offlineTitle}</Heading>
      <Text tone="muted">{dictionary.offlineHint}</Text>
      <OfflineDictionaries />
    </main>
  );
}
