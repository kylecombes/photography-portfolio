import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Disable ESLint rules that conflict with Prettier formatting.
  prettier,
  {
    rules: {
      // Back the "no nested ternaries" convention from CLAUDE.md.
      'no-nested-ternary': 'error',
    },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'generated/**', 'next-env.d.ts']),
]);

export default eslintConfig;
