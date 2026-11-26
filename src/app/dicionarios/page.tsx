import { Page } from "@/design-system/components/Page";
import { Heading } from "@/design-system/components/Heading";
import { Link } from "@/design-system/components/Link";
import { Text } from "@/design-system/components/Text";
import { OfflineDictionaries } from "@/features/dictionary";
import { messages } from "@/lib/messages/pt-br";

export default function DictionariesPage() {
  const { dictionary, reader } = messages;
  return (
    <Page>
      <Link href="/estante">{reader.shelf}</Link>
      <Heading>{dictionary.offlineTitle}</Heading>
      <Text tone="muted">{dictionary.offlineHint}</Text>
      <OfflineDictionaries />
    </Page>
  );
}
