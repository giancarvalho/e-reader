import { Button } from "@/design-system/components/Button";
import { Link } from "@/design-system/components/Link";
import { Heading } from "@/design-system/components/Heading";
import { Text } from "@/design-system/components/Text";
import { messages } from "@/lib/messages/pt-br";
import { normalizeInviteCode } from "@/lib/access/invite";
import { getAuthConfig } from "@/lib/supabase/config";
import { getGoogleConfig, hasGoogleCredentials } from "./google";
import { signInWithGoogle } from "./actions";
import styles from "./auth.module.css";

export async function SignInPage({ searchParams }: { searchParams: Promise<{ status?: string; codigo?: string }> }) {
  const config = getAuthConfig(process.env);
  const configured = Boolean(config && (!hasGoogleCredentials(process.env) || getGoogleConfig(process.env, config.origin)));
  const { status, codigo } = await searchParams;
  const invite = normalizeInviteCode(codigo);
  const { auth } = messages;

  return (
    <main className={styles.panel}>
      <Heading>{auth.signInTitle}</Heading>
      {(!configured || status === "unavailable") && <Text>{auth.unavailable}</Text>}
      {configured && status === "failed" && <Text>{auth.failed}</Text>}
      <form action={signInWithGoogle}>
        {invite && <input type="hidden" name="codigo" value={invite} />}
        <Button type="submit" disabled={!configured}>{auth.google}</Button>
      </form>
      <Link href="/" client>{auth.back}</Link>
    </main>
  );
}
