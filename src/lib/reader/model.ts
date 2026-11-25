export type ReadingPosition = { cfi: string; fraction: number };

export type ReaderPreferences = {
  theme: "auto" | "day" | "night" | "custom";
  font: "serif" | "sans";
  size: number;
  background: string;
  ink: string;
};

export const defaultPreferences: ReaderPreferences = {
  theme: "auto", font: "serif", size: 18, background: "#FAF5EC", ink: "#2B2420",
};

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
