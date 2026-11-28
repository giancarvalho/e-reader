"use client";

import { Icon } from "@/design-system/components/Icon";
import { Link } from "@/design-system/components/Link";
import { useInstall } from "@/lib/install";
import { messages } from "@/lib/messages/pt-br";

/** A row on the account page, only while the app is not installed on a phone. */
export function InstallAppRow() {
  const { kind } = useInstall();
  if (kind === "installed" || kind === "none") return null;
  return (
    <Link href="/instalar" client variant="row">
      <Icon name="install" /><span>{messages.install.title}</span><Icon name="next" />
    </Link>
  );
}
