import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// AGENTS.md, rule 3: a reusable component lives in the design system with an
// entry point, tests and a catalog entry. This test enforces that contract so
// it does not depend on a reviewer remembering it.
const root = join(process.cwd(), "src/design-system/components");
const catalogDir = join(process.cwd(), "src/app/dev/design");
const components = readdirSync(root, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name);

const read = (path: string) => readFileSync(path, "utf8");
const catalog = readdirSync(catalogDir).filter(name => name.endsWith(".tsx")).map(name => read(join(catalogDir, name))).join("\n");
const rendered = (name: string) => new RegExp(`<${name}[\\s>/]`).test(catalog);

// Components whose tests do not run axe yet. The list can only shrink: a
// component that gains an axe check must be removed from it.
const withoutAccessibilityCheck = new Set([
  "Avatar", "BookCard", "BookCover", "Heading", "Sheet", "StatusBanner", "Text",
]);

describe.each(components)("design-system component %s", name => {
  const dir = join(root, name);

  it("has an entry point, an implementation and a component test", () => {
    expect(existsSync(join(dir, "index.ts")), "index.ts").toBe(true);
    expect(existsSync(join(dir, `${name}.tsx`)), `${name}.tsx`).toBe(true);
    expect(existsSync(join(dir, `${name}.test.tsx`)), `${name}.test.tsx`).toBe(true);
  });

  it("appears in the design catalog, directly or through a cataloged component", () => {
    const composedBy = components.filter(other => other !== name
      && read(join(root, other, `${other}.tsx`)).includes(`from "../${name}"`));
    expect(rendered(name) || composedBy.some(rendered), `add <${name}> to src/app/dev/design`).toBe(true);
  });

  it("checks accessibility with axe, or is listed as a known gap", () => {
    const checked = read(join(dir, `${name}.test.tsx`)).includes("axe-core");
    if (withoutAccessibilityCheck.has(name)) {
      expect(checked, `${name} now runs axe: remove it from withoutAccessibilityCheck`).toBe(false);
    } else {
      expect(checked, `${name} needs an axe check`).toBe(true);
    }
  });
});
