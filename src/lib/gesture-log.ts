import { getViewport } from "@/design-system/viewport";
import { isOnline } from "@/lib/online";

// A small on-device ring buffer for diagnosing touch problems on real devices.
// It records event types, coordinates, timings and decisions only: never book text or positions.
export type GestureData = Record<string, string | number | boolean | undefined>;
export type GestureEntry = { t: number; k: string; d?: Record<string, string | number | boolean> };

const key = "e-reader-gesture-log";
const limit = 400;
const flushDelayMs = 300;
let buffer: GestureEntry[] | undefined;
let timer: number | undefined;
let listening = false;

function isEntry(value: unknown): value is GestureEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<GestureEntry>;
  return Number.isFinite(entry.t) && typeof entry.k === "string"
    && (entry.d === undefined || (typeof entry.d === "object" && entry.d !== null));
}

function stored(): GestureEntry[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
    return Array.isArray(saved) ? saved.filter(isEntry).slice(-limit) : [];
  } catch {
    return [];
  }
}

function flush() {
  window.clearTimeout(timer);
  timer = undefined;
  try {
    if (buffer) localStorage.setItem(key, JSON.stringify(buffer));
  } catch {
    // The log is optional when browser storage is unavailable.
  }
}

function compact(data?: GestureData) {
  if (!data) return undefined;
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);
  return entries.length ? Object.fromEntries(entries) as GestureEntry["d"] : undefined;
}

export function logGesture(kind: string, data?: GestureData) {
  try {
    buffer ??= stored();
    buffer.push({ t: Date.now(), k: kind, d: compact(data) });
    if (buffer.length > limit) buffer.splice(0, buffer.length - limit);
    if (!listening) {
      listening = true;
      window.addEventListener("pagehide", flush);
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });
    }
    timer ??= window.setTimeout(flush, flushDelayMs);
  } catch {
    // Logging must never break reading.
  }
}

export function readGestureLog(): GestureEntry[] {
  return buffer ? [...buffer] : stored();
}

export function clearGestureLog() {
  buffer = [];
  window.clearTimeout(timer);
  timer = undefined;
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing to clear without storage.
  }
}

export function describeViewport() {
  const { width, height, scale } = getViewport();
  return `${Math.round(width)}x${Math.round(height)}@${scale}`;
}

export function deviceEnvironment(): GestureData {
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone
    ?? window.matchMedia?.("(display-mode: standalone)").matches;
  return {
    app: process.env.NEXT_PUBLIC_APP_VERSION || "local",
    userAgent: navigator.userAgent,
    standalone,
    touchPoints: navigator.maxTouchPoints,
    pixelRatio: window.devicePixelRatio,
    screen: `${screen.width}x${screen.height}`,
    window: `${window.innerWidth}x${window.innerHeight}`,
    visualViewport: describeViewport(),
    orientation: screen.orientation?.type,
    language: navigator.language,
    online: isOnline(),
  };
}

function lines(data: GestureData) {
  return Object.entries(data)
    .filter(([, value]) => value !== undefined)
    .map(([name, value]) => `${name}: ${value}`);
}

export function formatDiagnosticReport(status: GestureData, entries: GestureEntry[], device: GestureData, now = new Date()) {
  const first = entries[0]?.t ?? 0;
  const events = entries.map(({ t, k, d }) =>
    `+${String(t - first).padStart(7)}ms ${k}${d ? ` ${Object.entries(d).map(([name, value]) => `${name}=${value}`).join(" ")}` : ""}`);
  return [
    "E-reader diagnostic",
    `generated: ${now.toISOString()}`,
    "--- status",
    ...lines(status),
    "--- device",
    ...lines(device),
    `--- gestures: ${entries.length}${entries[0] ? ` events from ${new Date(first).toISOString()}` : " events"}`,
    ...events,
  ].join("\n");
}
