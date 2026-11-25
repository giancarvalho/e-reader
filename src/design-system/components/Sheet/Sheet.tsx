"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Heading } from "../Heading";
import styles from "./Sheet.module.css";

export function Sheet({ title, onClose, children }: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => { element?.close(); };
  }, []);

  return (
    <dialog ref={dialog} aria-labelledby={headingId} className={styles.dialog} onCancel={event => {
      event.preventDefault();
      onClose();
    }}>
      <div className={styles.content}>
        <div id={headingId}><Heading as="h2">{title}</Heading></div>
        {children}
      </div>
    </dialog>
  );
}
