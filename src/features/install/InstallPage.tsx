"use client";

import { Heading } from "@/design-system/components/Heading";
import { Link } from "@/design-system/components/Link";
import { Page } from "@/design-system/components/Page";
import { useInstall } from "@/lib/install";
import { messages } from "@/lib/messages/pt-br";
import { InstallGuide } from "./InstallGuide";

export function InstallPage() {
  const { kind, canPrompt, install } = useInstall();
  return (
    <Page>
      <Heading>{messages.install.title}</Heading>
      <InstallGuide kind={kind} canPrompt={canPrompt} onInstall={() => void install()} />
      <Link href="/conta" client>{messages.install.back}</Link>
    </Page>
  );
}
