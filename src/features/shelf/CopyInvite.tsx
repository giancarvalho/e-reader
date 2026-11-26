"use client";

import { useState } from "react";
import { Button } from "@/design-system/components/Button";
import { Notice } from "@/design-system/components/Notice";
import { Sheet } from "@/design-system/components/Sheet";
import { TextField } from "@/design-system/components/TextField";
import { homeInvitePath } from "@/lib/access/invite";
import { messages } from "@/lib/messages/pt-br";

export function CopyInvite({ code }: { code: string }) {
  const [link, setLink] = useState<string>();
  const [status, setStatus] = useState<string>();
  const { access, reader } = messages;

  async function copy() {
    const value = new URL(homeInvitePath(code), window.location.origin).href;
    try {
      await navigator.clipboard.writeText(value);
      setStatus(access.inviteCopied);
    } catch {
      setLink(value);
      setStatus(undefined);
    }
  }

  return (
    <>
      <Button variant="quiet" onClick={() => void copy()}>{access.copyInvite}</Button>
      {status && <Notice>{status}</Notice>}
      {link && <Sheet title={access.copyInvite} closeLabel={reader.closePanel} onClose={() => setLink(undefined)}>
        <TextField label={access.inviteLink} readOnly value={link} onFocus={event => event.target.select()} />
      </Sheet>}
    </>
  );
}
