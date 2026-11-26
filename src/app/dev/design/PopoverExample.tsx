"use client";

import { useState } from "react";
import { ActionBar } from "@/design-system/components/ActionBar";
import { Button } from "@/design-system/components/Button";
import { Popover } from "@/design-system/components/Popover";
import { Text } from "@/design-system/components/Text";
import { messages } from "@/lib/messages/pt-br";
import styles from "./page.module.css";

export function PopoverExample() {
  const [open, setOpen] = useState(false);
  const { catalog } = messages;
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>{catalog.showPopover}</Button>
      {open && <Popover label={catalog.showPopover} onClose={() => setOpen(false)}>
        <Text>{catalog.body}</Text>
      </Popover>}
      <div className={styles.dock}>
        <ActionBar label={catalog.actionBar}>
          <Button variant="quiet">{catalog.quiet}</Button>
          <Button variant="quiet">{catalog.secondary}</Button>
        </ActionBar>
      </div>
    </>
  );
}
