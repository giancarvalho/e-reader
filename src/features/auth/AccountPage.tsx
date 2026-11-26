import { Avatar } from "@/design-system/components/Avatar";
import { redirect } from "next/navigation";
import { Link } from "@/design-system/components/Link";
import { Heading } from "@/design-system/components/Heading";
import { Text } from "@/design-system/components/Text";
import { messages } from "@/lib/messages/pt-br";
import { getRequestAuth } from "@/lib/supabase/server";
import { SignOutForm } from "./SignOutForm";
import styles from "./auth.module.css";

export async function AccountPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const request = await getRequestAuth();
  if (!request) redirect("/entrar");

  const { data, error } = await request.client.auth.getUser();
  if (error || !data.user) redirect("/entrar");

  const { status } = await searchParams;
  const { auth } = messages;
  const metadata = data.user.user_metadata;
  const name = stringValue(metadata.full_name) ?? stringValue(metadata.name);
  const photo = stringValue(metadata.avatar_url) ?? stringValue(metadata.picture);

  return (
    <main className={styles.panel}>
      <Heading>{auth.accountTitle}</Heading>
      {name && <section className={styles.profile}><Avatar name={name} src={photo} /><Text>{name}</Text></section>}
      <Link href="/convite" client>{auth.continue}</Link>
      <section className={styles.section}>
        <Heading as="h2">{auth.storage}</Heading>
        <Link href="/estante-offline">{messages.shelf.offline}</Link>
        <Link href="/dicionarios">{messages.dictionary.offlineTitle}</Link>
      </section>
      <section className={styles.section}>
        <Heading as="h2">{auth.help}</Heading>
        <Link href="/diagnostico" client>{messages.diagnostics.title}</Link>
      </section>
      <section className={styles.section}>
        <Text tone="muted">{auth.signOutEffect}</Text>
        {status === "signout_failed" && <Text>{auth.signOutFailed}</Text>}
        <SignOutForm />
      </section>
    </main>
  );
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
