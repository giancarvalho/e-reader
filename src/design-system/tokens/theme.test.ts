import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "src/design-system/tokens/base.css"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "");

function declarations(block: string) {
  return block.split(";").map(line => line.trim()).filter(Boolean).sort();
}

function body(selector: string, after = 0) {
  const start = css.indexOf(selector, after);
  expect(start, `${selector} block`).toBeGreaterThanOrEqual(0);
  const open = css.indexOf("{", start);
  return css.slice(open + 1, css.indexOf("}", open));
}

describe("theme tokens", () => {
  it("keeps the explicit Night theme and the system dark theme identical", () => {
    const night = declarations(body('[data-theme="night"]'));
    const system = declarations(body('[data-theme="auto"]', css.indexOf("@media (prefers-color-scheme: dark)")));
    expect(system).toEqual(night);
  });

  it("maps every Night primitive in the Night theme", () => {
    const night = body('[data-theme="night"]');
    const primitives = [...css.matchAll(/--night-([a-z]+):/g)].map(match => match[1]);
    expect(primitives.length).toBeGreaterThan(0);
    for (const name of primitives) expect(night, `--night-${name}`).toContain(`var(--night-${name})`);
  });

  it("recomputes theme-dependent tokens on every themed element", () => {
    // A custom property that reads --color-* is resolved where it is declared,
    // so nested themed sections (the reader, the catalog) need their own copy.
    const themed = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter(([, , content]) => /--[a-z-]+:[^;]*var\(--color-/.test(content) && !/--color-[a-z-]+:/.test(content));
    expect(themed.length).toBeGreaterThan(0);
    for (const [, selector] of themed) expect(selector.trim()).toBe(":root, [data-theme]");
  });
});
