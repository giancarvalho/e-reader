export type System = "reader" | "annotations" | "comments" | "download";
export type Entry = { system: System; state: "ok" | "error"; time: string };
type Snapshot = { last: Partial<Record<System, Entry>>; errors: Entry[] };

const key = "e-reader-diagnostics";
const systems = ["reader", "annotations", "comments", "download"];

function isEntry(value: unknown): value is Entry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<Entry>;
  return typeof entry.system === "string" && systems.includes(entry.system)
    && (entry.state === "ok" || entry.state === "error")
    && typeof entry.time === "string" && Number.isFinite(Date.parse(entry.time));
}

export function readDiagnostics(): Snapshot {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? "null");
    if (!saved || typeof saved !== "object") return { last: {}, errors: [] };
    const entries = Object.values(saved.last ?? {}).filter(isEntry);
    return {
      last: Object.fromEntries(entries.map(entry => [entry.system, entry])),
      errors: Array.isArray(saved.errors) ? saved.errors.filter(isEntry).slice(0, 12) : [],
    };
  } catch {
    return { last: {}, errors: [] };
  }
}

export function recordDiagnostic(system: System, state: Entry["state"]) {
  try {
    const snapshot = readDiagnostics();
    const previous = snapshot.last[system]?.state;
    const entry = { system, state, time: new Date().toISOString() };
    snapshot.last[system] = entry;
    if (state === "error" && previous !== "error") {
      snapshot.errors = [entry, ...snapshot.errors].slice(0, 12);
    }
    localStorage.setItem(key, JSON.stringify(snapshot));
    window.dispatchEvent(new Event(key));
  } catch {
    // Diagnostics remain optional if browser storage is unavailable.
  }
}

export function observeDiagnostics(onChange: () => void) {
  const storageEvent = (event: StorageEvent) => { if (event.key === key) onChange(); };
  window.addEventListener(key, onChange);
  window.addEventListener("storage", storageEvent);
  return () => {
    window.removeEventListener(key, onChange);
    window.removeEventListener("storage", storageEvent);
  };
}
