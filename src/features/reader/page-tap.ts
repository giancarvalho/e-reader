import { describeViewport, logGesture, type GestureData } from "@/lib/gesture-log";
import { tapZone } from "./page-gestures";
import { recentPress, type PressRecord } from "./word-press";

type PageTapOptions = {
  content: HTMLElement | null;
  isCancelled: () => boolean;
  selectionShown: () => boolean;
  dismissAnnotation: () => boolean;
  toggleControls: () => void;
  turn: (direction: "prev" | "next") => void;
};

const interactive = "a, button, input, select, textarea";
/** How long to wait for a `click` before a quick touch acts on its own. */
const clickGraceMs = 350;

/**
 * Decides what a tap on the chapter does: turn the page or toggle the bars, by zone.
 * Mouse taps arrive as `click`; quick touches also act by themselves when the browser sends no click.
 */
export function createPageTap(options: PageTapOptions) {
  let current: { event: MouseEvent; annotationHit: boolean } | undefined;
  let touchTimer: number | undefined;

  function stopTouchTimer() {
    window.clearTimeout(touchTimer);
    touchTimer = undefined;
  }

  function applyZone(doc: Document, clientX: number, source: "click" | "touch") {
    const area = options.content?.getBoundingClientRect();
    const bounds = doc.defaultView?.frameElement?.getBoundingClientRect();
    const blocker = options.dismissAnnotation() ? "annotation-dismissed"
      : doc.getSelection()?.toString() ? "text-selected"
        : !area?.width || !bounds ? "no-bounds"
          : options.selectionShown() ? "selection-open" : undefined;
    if (blocker || !area || !bounds) {
      logGesture("tap-ignored", { source, reason: blocker });
      return;
    }
    const fraction = (bounds.left + clientX - area.left) / area.width;
    const zone = tapZone(fraction);
    logGesture("tap-zone", { source, fraction: Math.round(fraction * 100) / 100, zone });
    if (zone === "toggle") options.toggleControls();
    else options.turn(zone);
  }

  function readTap(event: MouseEvent) {
    const doc = event.currentTarget as Document;
    const press = recentPress(doc);
    logGesture("click", {
      x: Math.round(event.clientX), y: Math.round(event.clientY), detail: event.detail, button: event.button,
      target: (event.target as Element | null)?.tagName?.toLowerCase(), defaultPrevented: event.defaultPrevented,
      press: press?.outcome ?? "none", pendingFallback: touchTimer !== undefined,
    });
    if (press) {
      // The touch that produced this click already decided what it was.
      stopTouchTimer();
      if (press.outcome !== "tap") {
        logGesture("click-ignored", { press: press.outcome });
        return;
      }
    }
    const currentTap = { event, annotationHit: false };
    current = currentTap;
    const onInteractive = (event.target as Element | null)?.closest?.(interactive);
    window.setTimeout(() => {
      if (current === currentTap) current = undefined;
      if (options.isCancelled() || currentTap.annotationHit || event.button !== 0) {
        if (currentTap.annotationHit) logGesture("tap-ignored", { source: "click", reason: "annotation-hit" });
        return;
      }
      // A mouse double click is a text gesture; quick touch taps are separate page turns.
      if (event.defaultPrevented || (!press && event.detail > 1) || onInteractive) {
        logGesture("tap-ignored", {
          source: "click", reason: event.defaultPrevented ? "default-prevented" : onInteractive ? "interactive" : "double-click",
          dismissedAnnotation: options.dismissAnnotation(),
        });
        return;
      }
      applyZone(doc, event.clientX, "click");
    }, 0);
  }

  // iOS Safari may not dispatch `click` for taps on plain text inside the chapter frame.
  function readTouchTap(press: PressRecord, target: Element | null, doc: Document) {
    stopTouchTimer();
    if (press.outcome !== "tap" || target?.closest?.(interactive)) return;
    logGesture("fallback-scheduled", { x: Math.round(press.x) });
    touchTimer = window.setTimeout(() => {
      touchTimer = undefined;
      logGesture("fallback-fired", { cancelled: options.isCancelled() });
      if (!options.isCancelled()) applyZone(doc, press.x, "touch");
    }, clickGraceMs);
  }

  return { readTap, readTouchTap, stop: stopTouchTimer, get current() { return current; } };
}

export function chapterLayout(doc: Document, content: HTMLElement | null): GestureData {
  const frame = doc.defaultView?.frameElement?.getBoundingClientRect();
  const area = content?.getBoundingClientRect();
  return {
    window: `${window.innerWidth}x${window.innerHeight}`,
    visualViewport: describeViewport(),
    frameLeft: frame && Math.round(frame.left), frameWidth: frame && Math.round(frame.width),
    areaLeft: area && Math.round(area.left), areaWidth: area && Math.round(area.width),
  };
}
