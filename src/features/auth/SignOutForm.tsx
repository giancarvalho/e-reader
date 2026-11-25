"use client";

import { useState } from "react";
import { Button } from "@/design-system/components/Button";
import { clearLocalShelf } from "@/lib/books/local";
import { messages } from "@/lib/messages/pt-br";
import { signOut } from "./actions";

export function SignOutForm() {
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);

  async function clearAndSignOut() {
    setPending(true);
    try {
      if (typeof indexedDB !== "undefined") await clearLocalShelf();
    } catch {
      setFailed(true);
      setPending(false);
      return;
    }
    await signOut();
  }

  return (
    <form action={clearAndSignOut}>
      <Button type="submit" loading={pending}>{messages.auth.signOut}</Button>
      {failed && <p role="status">{messages.auth.signOutFailed}</p>}
    </form>
  );
}
