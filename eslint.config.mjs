import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Power-of-Ten adaptation (rules 1, 4, 6, 7) for TypeScript.
  // Rule 10 — zero warnings — is enforced at the CLI via --max-warnings 0.
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Rule 1 — simple control flow. Block labels/labeled continues (goto-ish).
      "no-labels": "error",
      // Rule 4 — small functions. 60 LOC for pure TS; bumped for JSX since
      // markup inflates line counts without adding logic complexity.
      "max-lines-per-function": [
        "warn",
        { max: 60, skipBlankLines: true, skipComments: true, IIFEs: true },
      ],
      // Complementary: keep cyclomatic complexity bounded.
      complexity: ["warn", 15],
      // Rule 6 — smallest scope.
      "block-scoped-var": "error",
      "no-redeclare": "error",
      "no-shadow": "warn",
      // Rule 7 — check return values + param validation.
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "consistent-return": "error",
    },
  },
  // JSX-heavy files: relax function length to 120 lines (markup inflation).
  {
    files: ["**/*.tsx"],
    rules: {
      "max-lines-per-function": [
        "warn",
        { max: 120, skipBlankLines: true, skipComments: true, IIFEs: true },
      ],
    },
  },
]);

export default eslintConfig;
