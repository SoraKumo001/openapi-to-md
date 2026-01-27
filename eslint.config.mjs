import eslint from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import importPlugin from "eslint-plugin-import";
import prettierPlugin from "eslint-plugin-prettier";
import tslint from "typescript-eslint";

export default [
  eslint.configs.recommended,
  ...tslint.configs.recommended,
  eslintConfigPrettier,
  {
    plugins: {
      import: importPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      "@typescript-eslint/no-namespace": 0,
      "@typescript-eslint/no-unused-vars": "warn",
      "no-empty-pattern": 1,
      "no-empty": 1,
      "import/order": [
        "warn",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            ["parent", "sibling"],
            "object",
            "type",
            "index",
          ],
          pathGroupsExcludedImportTypes: ["builtin"],
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
        },
      ],
      "prettier/prettier": [
        0,
        {
          semi: true,
          singleQuote: false,
          printWidth: 100,
          trailingComma: "es5",
        },
      ],
    },
  },
];
