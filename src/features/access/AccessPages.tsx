import Link from "next/link";
import { redirect } from "next/navigation";
import { Heading } from "@/design-system/components/Heading";
import { Text } from "@/design-system/components/Text";
import { messages } from "@/lib/messages/pt-br";
import { InviteForm } from "./InviteForm";
import { getGroupAccess } from "./membership";
import styles from "./access.module.css";

export async function InvitePage() {
  const { status } = await getGroupAccess();
  if (status === "member") redirect("/estante");

  const { access } = messages;
  return (
    <main className={styles.page}>
      <Heading>{access.inviteTitle}</Heading>
      {status === "unavailable"
        ? <Text>{access.errors.unavailable}</Text>
        : <><Text>{access.inviteHint}</Text><InviteForm /></>}
      <Link href="/conta">{access.account}</Link>
    </main>
  );
}
