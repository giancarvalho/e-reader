// Visual decisions live in design tokens and design-system components.
// Feature and route CSS only arranges them. Violations that predate a rule are
// recorded in the file with "stylelint-disable <rule> -- baseline(<task>)";
// an unused disable is an error, so the baseline can only shrink.
function featureOnly({ columnWidth = false } = {}) {
  return {
    "property-disallowed-list": [
      [
        // Component identity: focus, shape and elevation come from the design system.
        "/^outline/", "/radius/", "box-shadow", "list-style",
        // Typography comes from Text and Heading.
        "font-family", "font-weight", "font-size", "letter-spacing",
      ],
      { message: "Use a design-system component or token for \"%s\" instead of styling it here (AGENTS.md, rules 3 and 4)." },
    ],
    "declaration-property-value-disallowed-list": [
      {
        "/^(min|max)-(inline|block)-size$/": columnWidth ? ["/--touch-target/"] : ["/--touch-target/", "/--layout-width/"],
        "/^(border|border-.*)$/": ["/var\\(--focus-ring\\)/"],
        font: ["/var\\(--font-/"],
      },
      { message: "Touch targets, page width, borders and fonts belong to design-system components (Button, Page, Section, Text, Heading)." },
    ],
  };
}

const config = {
  reportNeedlessDisables: true,
  rules: {
    "declaration-no-important": true,
    "color-no-hex": true,
    "function-disallowed-list": ["rgb", "rgba", "hsl", "hsla", "hwb", "lab", "lch", "oklab", "oklch"],
    "unit-disallowed-list": ["px", "rem", "em"],
  },
  overrides: [
    {
      files: ["src/design-system/**/*.css"],
      rules: { "unit-disallowed-list": null },
    },
    {
      files: ["src/design-system/tokens/**/*.css"],
      rules: {
        "color-no-hex": null,
        "function-disallowed-list": null,
        "unit-disallowed-list": null,
      },
    },
    {
      files: ["src/features/**/*.css", "src/app/**/*.css"],
      rules: featureOnly(),
    },
    {
      // The developer-only component catalog is a scratch surface and may style itself freely.
      files: ["src/app/dev/**/*.css"],
      rules: { "property-disallowed-list": null, "declaration-property-value-disallowed-list": null },
    },
    {
      // The reader's fixed viewport and toolbars span the screen but must line up
      // with the same centered column as every Page, so they may read --layout-width.
      files: ["src/features/reader/**/*.css"],
      rules: featureOnly({ columnWidth: true }),
    },
    {
      // The reader toolbars carry their own borders, type and touch targets; see the header of the file.
      files: ["src/features/reader/reader-chrome.module.css"],
      rules: { "property-disallowed-list": [["/radius/", "box-shadow", "list-style", "font-family", "font-weight", "font-size", "letter-spacing"]], "declaration-property-value-disallowed-list": null },
    },
  ],
};

export default config;
