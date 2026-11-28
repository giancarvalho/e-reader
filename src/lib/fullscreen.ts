/**
 * Full screen for the reader. Browsers only allow it from a tap or key press, so callers ask on the first one.
 * iPhone has no Fullscreen API: the installed app already runs without browser bars there.
 */
const preferenceKey = "reader-fullscreen";

export function fullscreenSupported() {
  return typeof document !== "undefined" && document.fullscreenEnabled === true;
}

/** Whether the reader should ask for full screen by itself. On unless the person turned it off on this device. */
export function readFullscreenPreference() {
  try {
    return localStorage.getItem(preferenceKey) !== "off";
  } catch {
    return true;
  }
}

export function saveFullscreenPreference(on: boolean) {
  try {
    localStorage.setItem(preferenceKey, on ? "on" : "off");
  } catch {
    // The choice still applies until the page closes.
  }
}

export function enterFullscreen() {
  if (!fullscreenSupported() || document.fullscreenElement) return;
  void document.documentElement.requestFullscreen({ navigationUI: "hide" }).catch(() => undefined);
}

export function leaveFullscreen() {
  if (typeof document === "undefined" || !document.fullscreenElement) return;
  void document.exitFullscreen().catch(() => undefined);
}
