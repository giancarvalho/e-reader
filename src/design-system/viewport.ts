/**
 * The part of the screen that is really visible. On phones the on-screen
 * keyboard shrinks the visual viewport without resizing the layout viewport, so
 * floating panels and sheets must read it to stay above the keyboard
 * (AGENTS.md, rule 12). Falls back to the window when the API is missing.
 */
export type Viewport = {
  left: number;
  top: number;
  width: number;
  height: number;
  /** The space covered at the bottom, such as by the keyboard. */
  bottomInset: number;
  /** Pinch-zoom factor, 1 when not zoomed. */
  scale: number;
};

/** Whether the browser provides the visual viewport API. */
export function hasVisualViewport() {
  return Boolean(window.visualViewport);
}

export function getViewport(): Viewport {
  const visual = window.visualViewport;
  if (!visual) return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight, bottomInset: 0, scale: 1 };
  return {
    left: visual.offsetLeft,
    top: visual.offsetTop,
    width: visual.width,
    height: visual.height,
    bottomInset: Math.max(0, window.innerHeight - visual.height - visual.offsetTop),
    scale: visual.scale ?? 1,
  };
}

/** Calls `callback` whenever the visible area changes size or position. Returns the cleanup. */
export function observeViewport(callback: () => void) {
  const visual = window.visualViewport;
  visual?.addEventListener("resize", callback);
  visual?.addEventListener("scroll", callback);
  window.addEventListener("resize", callback);
  return () => {
    visual?.removeEventListener("resize", callback);
    visual?.removeEventListener("scroll", callback);
    window.removeEventListener("resize", callback);
  };
}
