"use client";

import { Button } from "@/design-system/components/Button";
import { Notice } from "@/design-system/components/Notice";
import { Sheet } from "@/design-system/components/Sheet";
import { TextField } from "@/design-system/components/TextField";
import { homeInvitePath } from "@/lib/access/invite";
import { messages } from "@/lib/messages/pt-br";
import { useCopyText } from "@/lib/use-copy-text";

export function CopyInvite({ code }: { code: string }) {
  const { copy, copied, fallback, dismiss } = useCopyText();
  const { access, reader } = messages;

  return (
    <>
      <Button variant="quiet" onClick={() => void copy(new URL(homeInvitePath(code), window.location.origin).href)}>
        {access.copyInvite}
      </Button>
      {copied && <Notice>{access.inviteCopied}</Notice>}
      {fallback && <Sheet title={access.copyInvite} closeLabel={reader.closePanel} onClose={dismiss}>
        <TextField label={access.inviteLink} readOnly value={fallback} onFocus={event => event.target.select()} />
      </Sheet>}
    </>
  );
}
