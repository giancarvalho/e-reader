import { Avatar } from "@/design-system/components/Avatar";
import Link from "next/link";
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
    <main className={styles.account}>
      <header className={styles.accountHeader}>
        <Link className={styles.backLink} href="/convite" aria-label={auth.continue}>
          <AccountIcon name="back" />{messages.access.shelfTitle}
        </Link>
        <Heading>{auth.accountTitle}</Heading>
      </header>

      {name && <div className={styles.profile}><Avatar name={name} src={photo} /><Text>{name}</Text></div>}

      <section className={styles.section}>
        <Heading as="h2">{auth.storage}</Heading>
        <div className={styles.linkGroup}>
          <a href="/estante-offline" className={styles.accountLink}>
            <AccountIcon name="books" /><span>{shelf.offline}</span><AccountIcon name="next" />
          </a>
          <a href="/dicionarios" className={styles.accountLink}>
            <AccountIcon name="dictionary" /><span>{dictionary.offlineTitle}</span><AccountIcon name="next" />
          </a>
        </div>
      </section>

      <section className={styles.section}>
        <Heading as="h2">{auth.help}</Heading>
        <div className={styles.linkGroup}>
          <Link href="/diagnostico" className={styles.accountLink}>
            <AccountIcon name="diagnostics" /><span>{diagnostics.title}</span><AccountIcon name="next" />
          </Link>
        </div>
      </section>

      <footer className={styles.accountFooter}>
        <Text tone="muted">{auth.signOutEffect}</Text>
        {signOutFailed && <div role="status"><Text>{auth.signOutFailed}</Text></div>}
        <SignOutForm />
      </footer>
    </main>
  );
}

const paths = {
  back: "m14 6-6 6 6 6",
  next: "m10 6 6 6-6 6",
  books: "M4 19V5h4v14zm6 0V5h4v14zm6-13 3-1 3 13-3 1z",
  dictionary: "M4 19V6a2 2 0 0 1 2-2h13v16H6a2 2 0 0 1 0-4h13M8 8h7m-7 4h5",
  diagnostics: "M3 12h4l3-6 4 12 3-6h4",
};

function AccountIcon({ name }: { name: keyof typeof paths }) {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d={paths[name]} />
  </svg>;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
