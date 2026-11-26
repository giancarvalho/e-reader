import { readdirSync } from "node:fs";
import { defineConfig, globalIgnores } from "eslint/config";
import next from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";
import project from "./eslint-rules/index.mjs";

// Each feature is reachable from other features and from routes only through
// its index.ts (UI) or server.ts (server-only). Internals stay private so
// features can change independently.
const features = readdirSync("./src/features", { withFileTypes: true })
  .filter(entry => entry.isDirectory()).map(entry => entry.name);
const featureZones = features.map(name => ({
  target: [
    "./src/app",
    ...features.filter(other => other !== name).map(other => `./src/features/${other}`),
  ],
  from: `./src/features/${name}`,
  except: ["./index.ts", "./server.ts"],
  message: `Import ${name} through "@/features/${name}" (UI) or "@/features/${name}/server" (server-only) only.`,
}));

// Violations that predate a rule are counted per file and rule in
// eslint-suppressions.json (ESLint bulk suppressions). A new violation fails
// the lint, and so does a fixed one that is still listed: run
// "npm run lint:prune" in the same PR so the baseline can only shrink.
export default defineConfig([
  ...next,
  ...typescript,
  {
    linterOptions: { reportUnusedDisableDirectives: "error" },
    rules: {
      "import/no-restricted-paths": ["error", {
        zones: [
          { target: "./src/design-system", from: "./src/features" },
          { target: "./src/design-system", from: "./src/lib" },
          ...featureZones,
        ],
      }],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/design-system/**", "src/**/*.test.{ts,tsx}", "src/vendor/**"],
    plugins: { project },
    rules: {
      "project/no-live-region-role": "error",
      "project/no-raw-controls": "error",
      "no-restricted-properties": ["error",
        { object: "Intl", property: "NumberFormat", message: "Format numbers through src/lib/format." },
        { object: "Intl", property: "DateTimeFormat", message: "Format dates through src/lib/format." },
        { object: "window", property: "visualViewport", message: "Read the visible area through src/design-system/viewport (getViewport, observeViewport)." },
      ],
      "max-lines": ["error", { max: 300, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    // The shared formatters are the one place that constructs Intl objects.
    files: ["src/lib/format/**"],
    rules: { "no-restricted-properties": "off" },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/online/**", "src/**/*.test.{ts,tsx}", "src/vendor/**"],
    plugins: { project },
    rules: { "project/no-raw-connectivity": "error" },
  },
  {
    // Size ceiling for a file that predates max-lines. Lower it as it shrinks.
    files: ["src/features/reader/ReaderCanvas.tsx"],
    rules: { "max-lines": ["error", { max: 520, skipBlankLines: true, skipComments: true }] },
  },
  globalIgnores(["src/vendor/**", ".next/**", "next-env.d.ts", "public/sw.js"]),
]);
