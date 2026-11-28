/** Tap shorter than this turns the page or toggles the bars. */
export const tapMaxMs = 250;
/** A still press held this long selects the word under the finger. */
export const holdMs = 500;
/** Finger travel (px) beyond which a press is a drag, not a tap or a hold. */
export const movementTolerance = 10;
/** Drags starting this close (px) to a screen edge belong to the system "back" gesture. */
export const systemEdgePx = 24;
/** Share of the page width, on each side, that turns the page on tap. */
export const turnZone = 0.3;

export type PressOutcome = "tap" | "dead" | "hold" | "drag";

export function classifyPress(durationMs: number, travelPx: number): PressOutcome {
  if (travelPx > movementTolerance) return "drag";
  if (durationMs <= tapMaxMs) return "tap";
  if (durationMs >= holdMs) return "hold";
  // Between a tap and a hold nothing happens, so a hesitant press never turns the page.
  return "dead";
}

export function tapZone(fraction: number): "prev" | "next" | "toggle" {
  if (fraction < turnZone) return "prev";
  if (fraction > 1 - turnZone) return "next";
  return "toggle";
}

export function startsOnSystemEdge(x: number, width: number) {
  return x < systemEdgePx || x > width - systemEdgePx;
}
