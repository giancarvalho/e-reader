import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import manifest from "../src/app/manifest";

describe("PWA manifest", () => {
  it("launches the shelf in standalone mode", () => {
    expect(manifest()).toMatchObject({ id: "/", start_url: "/estante", scope: "/", display: "standalone" });
  });

  it("gives the installed Android window a dark fallback for its system bars", () => {
    expect(manifest()).toMatchObject({ theme_color: "#17130F", background_color: "#17130F" });
  });

  it("ships install icons at the declared sizes", () => {
    const icons = manifest().icons ?? [];
    expect(icons.map(({ sizes }) => sizes)).toEqual(["192x192", "512x512"]);
    for (const icon of icons) {
      expect(existsSync(`public${icon.src}`)).toBe(true);
    }
  });
});
