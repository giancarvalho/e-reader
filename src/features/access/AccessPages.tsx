import Link from "next/link";
import { redirect } from "next/navigation";
import { Heading } from "@/design-system/components/Heading";
import { Text } from "@/design-system/components/Text";
import { normalizeInviteCode } from "@/lib/access/invite";
import { messages } from "@/lib/messages/pt-br";
import { InviteForm } from "./InviteForm";
import { getGroupAccess } from "./membership";
import styles from "./access.module.css";

export async function InvitePage({ searchParams }: { searchParams: Promise<{ codigo?: string }> }) {
  const code = normalizeInviteCode((await searchParams).codigo);
  const result = await getGroupAccess(code);
  if (result.status === "member") redirect("/estante");
  const group = result.status === "invite_required" && code
    ? (await result.client.rpc("preview_group_invite", { invite_code: code })).data
    : undefined;

  const { access } = messages;
  return (
    <main className={styles.page}>
      <Heading>{access.inviteTitle}</Heading>
      {result.status === "unavailable"
        ? <Text>{access.errors.unavailable}</Text>
        : <><Text>{typeof group === "string" ? `${access.invitedTo} ${group}` : access.inviteHint}</Text><InviteForm initialCode={code} /></>}
      <Link href="/conta">{access.account}</Link>
    </main>
  );
}
