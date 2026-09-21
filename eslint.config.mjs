import { fileURLToPath } from "node:url";
import tseslint from "typescript-eslint";
import obsidianmd from "eslint-plugin-obsidianmd";

// Match the directory's API compatibility check without changing formatting.
export default [
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: fileURLToPath(new URL(".", import.meta.url)),
      },
    },
    plugins: { obsidianmd },
    rules: { "obsidianmd/no-unsupported-api": "error" },
  },
];
