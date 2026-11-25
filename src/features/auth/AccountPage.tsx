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
  const { auth } = messages;
  const metadata = data.user.user_metadata;
  const name = stringValue(metadata.full_name) ?? stringValue(metadata.name);
  const photo = stringValue(metadata.avatar_url) ?? stringValue(metadata.picture);
  const photoUrl = photo && URL.parse(photo);

  return (
    <main className={styles.panel}>
      <Heading>{auth.accountTitle}</Heading>
      {photoUrl && photoUrl.protocol === "https:" && photoUrl.hostname === "lh3.googleusercontent.com" && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img className={styles.photo} src={photoUrl.href} referrerPolicy="no-referrer" alt="" />
      )}
      {name && <Text>{name}</Text>}
      <Link href="/convite">{auth.continue}</Link>
      {status === "signout_failed" && <Text>{auth.signOutFailed}</Text>}
      <SignOutForm />
    </main>
  );
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
