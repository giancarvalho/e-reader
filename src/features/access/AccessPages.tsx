import { redirect } from "next/navigation";
import { Link } from "@/design-system/components/Link";
import { Heading } from "@/design-system/components/Heading";
import { Text } from "@/design-system/components/Text";
import { normalizeInviteCode } from "@/lib/access/invite";
import { messages } from "@/lib/messages/pt-br";
import { InviteForm } from "./InviteForm";
import { getGroupAccess } from "./membership";
import styles from "./access.module.css";

export async function InvitePage({ searchParams }: { searchParams: Promise<{ codigo?: string; status?: string }> }) {
  const { codigo, status } = await searchParams;
  const code = normalizeInviteCode(codigo);
  const error = status === "invalid_code" || status === "rate_limited" || status === "unavailable" ? status : undefined;
  const result = await getGroupAccess(code);
  if (result.status === "member" && !error) redirect("/estante");
  const group = result.status === "invite_required" && code
    ? (await result.client.rpc("preview_group_invite", { invite_code: code })).data
    : undefined;

  const { access } = messages;
  return (
    <main className={styles.page}>
      <Heading>{access.inviteTitle}</Heading>
      {error && result.status !== "unavailable" && <div role="status"><Text>{access.errors[error]}</Text></div>}
      {result.status === "unavailable"
        ? <Text>{access.errors.unavailable}</Text>
        : <><Text>{typeof group === "string" ? `${access.invitedTo} ${group}` : access.inviteHint}</Text><InviteForm initialCode={code} /></>}
      <Link href="/conta" client>{access.account}</Link>
    </main>
  );
}
