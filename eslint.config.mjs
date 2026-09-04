import coreWebVitalsConfig from "eslint-config-next/core-web-vitals";

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  ...coreWebVitalsConfig,
  {
    rules: {
      // --- Disabled: overly strict new rules in react-hooks@7 ---
      // Calling setState() directly within a useEffect body (with no async/event)
      // is a well-established React pattern for hydration guards, mobile detection,
      // mounting checks, etc. This rule produces false positives for valid code.
      "react-hooks/set-state-in-effect": "off",
      // Disallow calling impure functions (e.g. Date.now()) during render.
      // We use it inside a helper function called from a render, which is fine.
      "react-hooks/purity": "off",

      // --- Warnings only (don't block commits) ---
      "no-unused-vars": "warn",
      "@next/next/no-img-element": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "jsx-a11y/alt-text": "warn",
    },
  },
];

export default eslintConfig;
