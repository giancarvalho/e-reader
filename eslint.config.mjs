import { defineConfig, globalIgnores } from "eslint/config";
import next from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

export default defineConfig([
  ...next,
  ...typescript,
  {
    rules: {
      "import/no-restricted-paths": ["error", {
        zones: [
          { target: "./src/design-system", from: "./src/features" },
          { target: "./src/design-system", from: "./src/lib" },
        ],
      }],
    },
  },
  globalIgnores([".next/**", "next-env.d.ts", "public/sw.js"]),
]);
