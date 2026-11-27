import { GestureLogActions } from "@/features/diagnostics";
import { Avatar } from "@/design-system/components/Avatar";
import { Icon } from "@/design-system/components/Icon";
import { Link } from "@/design-system/components/Link";
import { Notice } from "@/design-system/components/Notice";
import { Page } from "@/design-system/components/Page";
import { Section } from "@/design-system/components/Section";
import { redirect } from "next/navigation";
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
  const metadata = data.user.user_metadata;
  const name = stringValue(metadata.full_name) ?? stringValue(metadata.name);
  const photo = stringValue(metadata.avatar_url) ?? stringValue(metadata.picture);
  return <AccountContent name={name} photo={photo} signOutFailed={status === "signout_failed"} />;
}

export function AccountContent({ name, photo, signOutFailed }: {
  name?: string;
  photo?: string;
  signOutFailed: boolean;
}) {
  const { auth, shelf, dictionary, diagnostics } = messages;

  return (
    <Page>
      <div className={styles.account}>
        <header className={styles.accountHeader}>
          <div className={styles.backLink}><Link href="/convite" client tone="muted" aria-label={auth.continue}>
            <Icon name="back" />{messages.access.shelfTitle}
          </Link></div>
          <Heading>{auth.accountTitle}</Heading>
        </header>

        {name && <Section variant="surface"><div className={styles.profile}><Avatar name={name} src={photo} /><Text>{name}</Text></div></Section>}

        <section className={styles.section}>
          <Heading as="h2" variant="label">{auth.storage}</Heading>
          <Section variant="surface">
            <Link href="/estante-offline" variant="row">
              <Icon name="books" /><span>{shelf.offline}</span><Icon name="next" />
            </Link>
            <Link href="/dicionarios" variant="row">
              <Icon name="dictionary" /><span>{dictionary.offlineTitle}</span><Icon name="next" />
            </Link>
          </Section>
        </section>

        <section className={styles.section}>
          <Heading as="h2" variant="label">{auth.help}</Heading>
          <Section variant="surface">
            <Link href="/diagnostico" client variant="row">
              <Icon name="diagnostics" /><span>{diagnostics.title}</span><Icon name="next" />
            </Link>
          </Section>
          <Section variant="surface"><GestureLogActions /></Section>
        </section>

        <footer className={styles.accountFooter}>
          <Text tone="muted">{auth.signOutEffect}</Text>
          <Notice>{signOutFailed ? auth.signOutFailed : undefined}</Notice>
          <SignOutForm />
        </footer>
      </div>
    </Page>
  );
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
