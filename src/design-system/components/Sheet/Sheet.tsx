"use client";

import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from "react";
import { Heading } from "../Heading";
import { Button } from "../Button";
import styles from "./Sheet.module.css";

function isBackdrop(event: MouseEvent<HTMLDialogElement>) {
  if (event.target !== event.currentTarget) return false;
  const { top, right, bottom, left } = event.currentTarget.getBoundingClientRect();
  return event.clientX < left || event.clientX >= right || event.clientY < top || event.clientY >= bottom;
}

export function Sheet({ title, closeLabel, onClose, children, variant }: {
  title: string;
  variant?: "compact";
  closeLabel?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pressedBackdrop = useRef(false);
  const headingId = useId();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const viewport = window.visualViewport;
    function resize() {
      if (!viewport || !element) return;
      element.style.setProperty("--sheet-viewport", `${viewport.height}px`);
      element.style.setProperty("--sheet-bottom", `${Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)}px`);
    }
    resize();
    viewport?.addEventListener("resize", resize);
    viewport?.addEventListener("scroll", resize);
    element.showModal();
    return () => {
      viewport?.removeEventListener("resize", resize);
      viewport?.removeEventListener("scroll", resize);
      element.close();
    };
  }, []);

  return (
    <dialog ref={dialog} aria-labelledby={headingId} className={styles.dialog} data-variant={variant}
      onPointerDown={event => { pressedBackdrop.current = event.button === 0 && isBackdrop(event); }}
      onClick={event => {
        const shouldClose = pressedBackdrop.current && isBackdrop(event);
        pressedBackdrop.current = false;
        if (shouldClose) onClose();
      }}
      onCancel={event => {
        event.preventDefault();
        onClose();
      }}>
      <div className={styles.content}>
        <div className={styles.header}>
          <div id={headingId}><Heading as="h2">{title}</Heading></div>
          {closeLabel && <Button variant="icon" aria-label={closeLabel} onClick={onClose}>×</Button>}
        </div>
        {children}
      </div>
    </dialog>
  );
}
