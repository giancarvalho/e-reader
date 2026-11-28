import { redirect } from "next/navigation";
import { getGroupAccess } from "@/features/access";
import { Page } from "@/design-system/components/Page";
import { Heading } from "@/design-system/components/Heading";
import { Text } from "@/design-system/components/Text";
import { normalizeInviteCode } from "@/lib/access/invite";
import { messages } from "@/lib/messages/pt-br";
import type { ShelfBook } from "@/lib/books/local";
import { InstallHint } from "@/features/install";
import { ShelfClient } from "./ShelfClient";

export async function ShelfPage() {
  const access = await getGroupAccess();
  if (access.status === "invite_required") redirect("/convite");
  if (access.status === "unavailable") return <ShelfUnavailable />;

  const { data, error } = await access.client.from("books")
    .select("id,group_id,title,author,language,cover_path,position,is_current")
    .eq("group_id", access.groupId).order("position").order("id")
    .returns<ShelfBook[]>();
  if (error) return <ShelfUnavailable />;

  const [group, invite] = await Promise.all([
    access.client.from("groups").select("name").eq("id", access.groupId).maybeSingle(),
    access.organizer
      ? access.client.from("group_invites").select("code").eq("group_id", access.groupId).maybeSingle()
      : null,
  ]);
  const books = data ?? [];
  const paths = books.flatMap(book => book.cover_path ? [book.cover_path] : []);
  const links = paths.length
    ? await access.client.storage.from("books").createSignedUrls(paths, 600)
    : null;
  const byPath = new Map(links?.data?.map(link => [link.path, link.signedUrl]) ?? []);
  const covers: Record<string, string> = {};
  for (const book of books) {
    const url = book.cover_path && byPath.get(book.cover_path);
    if (url) covers[book.id] = url;
  }

  return (
    <Page>
      <ShelfClient snapshot={{ userId: access.userId, books }} covers={covers} organizer={access.organizer}
        groupName={group.data?.name} inviteCode={normalizeInviteCode(invite?.data?.code)} />
      <InstallHint />
    </Page>
  );
}

function ShelfUnavailable() {
  return (
    <Page>
      <Heading>{messages.access.shelfTitle}</Heading>
      <Text>{messages.access.errors.unavailable}</Text>
    </Page>
  );
}
