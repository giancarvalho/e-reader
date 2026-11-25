import Link from "next/link";
import { Button } from "@/design-system/components/Button";
import { Heading } from "@/design-system/components/Heading";
import { Text } from "@/design-system/components/Text";
import { messages } from "@/lib/messages/pt-br";
import { getAuthConfig } from "@/lib/supabase/config";
import { signInWithGoogle } from "./actions";
import styles from "./auth.module.css";

export async function SignInPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const configured = Boolean(getAuthConfig(process.env));
  const { status } = await searchParams;
  const { auth } = messages;

  return (
    <main className={styles.panel}>
      <Heading>{auth.signInTitle}</Heading>
      {(!configured || status === "unavailable") && <Text>{auth.unavailable}</Text>}
      {configured && status === "failed" && <Text>{auth.failed}</Text>}
      <form action={signInWithGoogle}>
        <Button type="submit" disabled={!configured}>{auth.google}</Button>
      </form>
      <Link href="/">{auth.back}</Link>
    </main>
  );
}
