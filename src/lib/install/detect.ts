/** What the app can offer on this device, from how it is being opened. */
export type InstallKind =
  | "installed" // already running as an installed app
  | "ios" // iPhone or iPad browser: the only way is Share > Add to Home Screen
  | "android" // Android browser: native prompt when available, menu otherwise
  | "embedded" // a web view inside another app (Instagram, WhatsApp...) cannot install
  | "none"; // desktop or unknown: not part of the install hint

export type InstallEnvironment = { userAgent: string; maxTouchPoints: number; standalone: boolean };

const insideOtherApp = /FBAN|FBAV|Instagram|Line\/|MicroMessenger|Snapchat|TikTok|GSA\/|; wv\)/;

export function installKind({ userAgent, maxTouchPoints, standalone }: InstallEnvironment): InstallKind {
  if (standalone) return "installed";
  // iPadOS asks for the desktop site by default and reports a Mac, but it has a touch screen.
  const ios = /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
  const android = /Android/.test(userAgent);
  if (!ios && !android) return "none";
  // Web views on iOS do not carry the Safari token that the real browsers send.
  if (insideOtherApp.test(userAgent) || (ios && !/Safari\//.test(userAgent))) return "embedded";
  return ios ? "ios" : "android";
}
