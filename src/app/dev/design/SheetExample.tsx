"use client";

import { useState } from "react";
import { Button } from "@/design-system/components/Button";
import { Sheet } from "@/design-system/components/Sheet";
import { Text } from "@/design-system/components/Text";
import { messages } from "@/lib/messages/pt-br";

export function SheetExample() {
  const [open, setOpen] = useState(false);
  const { catalog } = messages;
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>{catalog.showSheet}</Button>
      {open && <Sheet title={catalog.showSheet} onClose={() => setOpen(false)}>
        <Text>{catalog.body}</Text>
        <Button variant="quiet" onClick={() => setOpen(false)}>{messages.comments.close}</Button>
      </Sheet>}
    </>
  );
}
