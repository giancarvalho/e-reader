import { isDarkColor, type ReaderPreferences } from "@/lib/reader/model";

export function readerStyles(preferences: ReaderPreferences) {
  const probe = document.createElement("div");
  document.body.append(probe);
  const palette = (theme: Exclude<ReaderPreferences["theme"], "custom">) => {
    probe.dataset.theme = theme;
    const computed = getComputedStyle(probe);
    return {
      colors: `color: ${computed.getPropertyValue("--color-ink")} !important; background: ${computed.getPropertyValue("--color-bg")} !important;`,
      dark: computed.colorScheme === "dark",
    };
  };
  const safeColor = (value: string, fallback: string) => /^#[a-f0-9]{6}$/i.test(value) ? value : fallback;
  const chosen = preferences.theme === "custom"
    ? {
      colors: `color: ${safeColor(preferences.ink, "#2B2420")} !important; background: ${safeColor(preferences.background, "#FAF5EC")} !important;`,
      dark: isDarkColor(safeColor(preferences.background, "#FAF5EC")),
    }
    : palette(preferences.theme);
  probe.remove();
  return `
    html[data-reader-word-press="pending"], html[data-reader-word-press="pending"] * {
      -webkit-user-select: none !important; user-select: none !important;
    }
    @media (pointer: coarse) {
      html { -webkit-touch-callout: none; }
      html:not([data-reader-selectable]), html:not([data-reader-selectable]) * {
        -webkit-user-select: none !important; user-select: none !important;
      }
    }
    html, body { ${chosen.colors} color-scheme: ${chosen.dark ? "dark" : "light"}; }
    body { font: ${preferences.size}px/1.55 ${preferences.font === "serif" ? "serif" : "sans-serif"} !important; }
    p, li, blockquote { color: inherit !important; font-family: inherit !important; font-size: 1em !important; }
  `;
}
