/**
 * Full screen for the reader. Browsers only allow it from a tap or key press, so callers ask on the first one.
 * iPhone has no Fullscreen API: the installed app already runs without browser bars there.
 */
export function enterFullscreen() {
  if (typeof document === "undefined" || !document.fullscreenEnabled || document.fullscreenElement) return;
  void document.documentElement.requestFullscreen({ navigationUI: "hide" }).catch(() => undefined);
}

export function leaveFullscreen() {
  if (typeof document === "undefined" || !document.fullscreenElement) return;
  void document.exitFullscreen().catch(() => undefined);
}
