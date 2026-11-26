// Project rules that keep UI and platform behavior in one place each.
// Every rule names the shared building block to use instead. If that block
// does not exist yet, create it in the design system (AGENTS.md, rule 3)
// rather than working around the rule.

/** @returns {import("eslint").Rule.RuleModule} */
function selectorRule(selectors, message) {
  return {
    meta: { type: "problem", schema: [], messages: { restricted: message } },
    create(context) {
      return Object.fromEntries(selectors.map(selector => [selector, node => {
        context.report({ node, messageId: "restricted" });
      }]));
    },
  };
}

export const rules = {
  "no-live-region-role": selectorRule(
    ["JSXAttribute[name.name='role'][value.value=/^(status|alert)$/]"],
    "Do not set role=\"status\" or role=\"alert\" by hand. Use the design-system Notice so announcements share one structure and typography.",
  ),
  "no-raw-controls": selectorRule(
    ["JSXOpeningElement[name.type='JSXIdentifier'][name.name=/^(button|input|textarea|dialog|progress)$/]"],
    "Do not render raw <button>, <input>, <textarea>, <dialog> or <progress>. Use the matching design-system component (Button, TextField, TextArea, Sheet, Progress).",
  ),
  "no-raw-connectivity": selectorRule(
    [
      "MemberExpression[object.name='navigator'][property.name='onLine']",
      "CallExpression[callee.property.name=/^(addEventListener|removeEventListener)$/][arguments.0.value=/^(online|offline)$/]",
    ],
    "Do not read navigator.onLine or listen to online/offline directly. Use the shared connectivity hooks in src/lib/online.",
  ),
};

const plugin = { rules };
export default plugin;
