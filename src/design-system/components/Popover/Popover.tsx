"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { getViewport, observeViewport } from "../../viewport";
import styles from "./Popover.module.css";

type Anchor = { x: number; top: number; bottom: number };

type PopoverProps = {
  /** The accessible name of the panel. */
  label: string;
  onClose: () => void;
  /** Where the panel points to, in viewport coordinates. Without it the panel docks at the bottom. */
  anchor?: () => Anchor | undefined;
  variant?: "panel" | "toolbar";
  children: ReactNode;
};

/**
 * A non-modal panel that floats next to what it belongs to. It keeps itself
 * inside the visible area above the on-screen keyboard and closes on Escape
 * or outside presses. Toolbars preserve focus on the underlying selection.
 */
export function Popover({ label, onClose, anchor, variant = "panel", children }: PopoverProps) {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; });

  useEffect(() => {
    const node = panel.current;
    if (!node) return;
    const place = () => {
      const position = anchor?.();
      const { left, top, width, height } = getViewport();
      const inset = parseFloat(getComputedStyle(node).paddingTop) || 0;
      node.style.maxWidth = Math.max(0, width - 2 * inset) + "px";
      node.style.maxHeight = Math.max(0, height - 2 * inset) + "px";
      const box = node.getBoundingClientRect();
      node.style.left = Math.max(left + inset, Math.min((position?.x ?? left + width / 2) - box.width / 2, left + width - box.width - inset)) + "px";
      const below = (position?.bottom ?? top + height) + inset;
      const above = (position?.top ?? top + height) - box.height - inset;
      const fitsAbove = above >= top + inset;
      const fitsBelow = below + box.height <= top + height - inset;
      const preferAbove = variant === "toolbar" && fitsAbove;
      const panelTop = Math.max(top + inset, Math.min(
        !preferAbove && fitsBelow ? below : above,
        top + height - box.height - inset,
      ));
      node.style.top = `${panelTop}px`;
      // Keep a field being typed in visible when the keyboard shrinks the viewport.
      const focused = document.activeElement;
      if (focused instanceof HTMLTextAreaElement && node.contains(focused)) {
        const overflow = focused.getBoundingClientRect().bottom - (panelTop + node.clientHeight - inset);
        if (overflow > 0) node.scrollTop += overflow;
      }
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(node);
    const stopObserving = observeViewport(place);
    return () => { observer.disconnect(); stopObserving(); };
  }, [anchor, variant]);

  useEffect(() => {
    if (variant === "toolbar") return;
    const node = panel.current;
    const previous = document.activeElement;
    node?.focus({ preventScroll: true });
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected &&
        (document.activeElement === document.body || node?.contains(document.activeElement))) {
        previous.focus({ preventScroll: true });
      }
    };
  }, [variant]);

  useEffect(() => {
    function outside(event: PointerEvent) { if (!panel.current?.contains(event.target as Node)) close.current(); }
    function key(event: KeyboardEvent) { if (event.key === "Escape") close.current(); }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", key);
    };
  }, []);

  return (
    <div ref={panel} className={styles.popover} data-variant={variant} tabIndex={variant === "panel" ? -1 : undefined}
      role={variant === "toolbar" ? "group" : "dialog"} aria-label={label}
      onMouseDown={variant === "toolbar" ? event => event.preventDefault() : undefined}>
      {children}
    </div>
  );
}
