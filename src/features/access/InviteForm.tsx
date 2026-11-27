"use client";

import { useActionState, useState } from "react";
import { Button } from "@/design-system/components/Button";
import { Notice } from "@/design-system/components/Notice";
import { TextField } from "@/design-system/components/TextField";
import { messages } from "@/lib/messages/pt-br";
import { joinGroup } from "./actions";
import styles from "./access.module.css";

export function InviteForm({ initialCode }: { initialCode?: string }) {
  const [state, action, pending] = useActionState(joinGroup, {});
  const [code, setCode] = useState(initialCode ?? "");
  const { access } = messages;
  const error = state.error ? access.errors[state.error] : undefined;

  return (
    <form className={styles.panel} action={action}>
      <TextField
        name="code"
        value={code}
        onChange={(event) => setCode(event.target.value)}
        label={access.code}
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        maxLength={128}
        error={state.error === "invalid_code" ? error : undefined}
        required
      />
      <Notice announceOnly={!pending && state.error === "invalid_code"}>{pending ? access.joining : error}</Notice>
      <Button type="submit" loading={pending}>{access.join}</Button>
    </form>
  );
}
