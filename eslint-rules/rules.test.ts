import { RuleTester } from "eslint";
import { describe, it } from "vitest";
import plugin from "./index.mjs";

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({
  languageOptions: { ecmaVersion: "latest", sourceType: "module", parserOptions: { ecmaFeatures: { jsx: true } } },
});

tester.run("no-live-region-role", plugin.rules["no-live-region-role"], {
  valid: ["<div role=\"dialog\" />", "<Notice />"],
  invalid: [
    { code: "<div role=\"status\" />", errors: 1 },
    { code: "<p role=\"alert\">x</p>", errors: 1 },
  ],
});

tester.run("no-raw-controls", plugin.rules["no-raw-controls"], {
  valid: ["<Button />", "<a href=\"/\" />", "<Progress />", "<input type=\"hidden\" name=\"codigo\" />"],
  invalid: [
    { code: "<button />", errors: 1 },
    { code: "<input />", errors: 1 },
    { code: "<input type=\"color\" />", errors: 1 },
    { code: "<input type=\"text\" />", errors: 1 },
    { code: "<textarea />", errors: 1 },
    { code: "<dialog />", errors: 1 },
    { code: "<progress value={1} />", errors: 1 },
  ],
});

tester.run("no-raw-connectivity", plugin.rules["no-raw-connectivity"], {
  valid: ["window.addEventListener(\"resize\", f)", "const online = useOnline()"],
  invalid: [
    { code: "navigator.onLine", errors: 1 },
    { code: "window.addEventListener(\"online\", f)", errors: 1 },
    { code: "window.removeEventListener(\"offline\", f)", errors: 1 },
  ],
});
