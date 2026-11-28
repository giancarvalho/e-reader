export type ReadingPosition = { cfi: string; fraction: number };

export const readerThemes = ["day", "sunset", "night", "midnight", "custom"] as const;
export type ReaderTheme = (typeof readerThemes)[number];

export type ReaderPreferences = {
  theme: ReaderTheme;
  font: "serif" | "sans";
  size: number;
  background: string;
  ink: string;
};

export const defaultPreferences: ReaderPreferences = {
  theme: "day", font: "serif", size: 18, background: "#FAF5EC", ink: "#2B2420",
};

/** Colors the old Sépia preset stored as a custom theme, before it became its own theme. */
const legacySepia = { background: "#efdfc2", ink: "#39271c" };

/**
 * Brings stored preferences up to the current themes. The removed "auto" theme becomes day or night, following
 * the device once; Sépia, which used to be saved as a custom theme, becomes Pôr do Sol.
 */
export function normalizePreferences(stored: Omit<ReaderPreferences, "theme"> & { theme: string }, systemDark: boolean): ReaderPreferences {
  const { theme } = stored;
  if (theme === "auto") return { ...stored, theme: systemDark ? "night" : "day" };
  if (theme === "custom" && stored.background.toLowerCase() === legacySepia.background && stored.ink.toLowerCase() === legacySepia.ink) {
    return { ...stored, theme: "sunset" };
  }
  return (readerThemes as readonly string[]).includes(theme) ? { ...stored, theme: theme as ReaderTheme } : { ...stored, theme: "day" };
}

/** Whether the device is set to a dark appearance. Light when it cannot tell. */
export function prefersDark() {
  return typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches;
}

/** The theme a reader starts with before choosing one: day or night, following the device. */
export function initialPreferences(): ReaderPreferences {
  return { ...defaultPreferences, theme: prefersDark() ? "night" : "day" };
}

/** Whether a custom background is dark enough to need the light-on-dark accent. */
export function isDarkColor(hex: string) {
  return luminance(hex) < 0.18;
}

export type ReaderRecord<T> = {
  value: T;
  pending: string | null;
  updatedAt: string | null;
};

export type ReaderState = {
  position?: ReaderRecord<ReadingPosition>;
  preferences?: ReaderRecord<ReaderPreferences>;
};

export function reconcileRecord<T>(
  current: ReaderRecord<T> | undefined,
  sent: ReaderRecord<T> | undefined,
  received: ReaderRecord<T> | undefined,
) {
  if (!received || current?.pending !== sent?.pending || current?.updatedAt !== sent?.updatedAt) return current;
  if (current?.updatedAt && received.updatedAt && Date.parse(current.updatedAt) > Date.parse(received.updatedAt)) {
    return current;
  }
  return received;
}

function luminance(hex: string) {
  const channel = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

export function contrastRatio(background: string, ink: string) {
  const a = luminance(background);
  const b = luminance(ink);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
