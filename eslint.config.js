import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Single flat ESLint config for the whole workspace. Keeping one config avoids
 * three slightly different rule sets drifting apart.
 */
export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/src/generated/**',
      '**/*.d.ts',
    ],
  },

  js.configs.recommended,
  tseslint.configs.recommended,

  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'error',
      'object-shorthand': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // API and shared package: Node.js
  {
    files: ['apps/api/**/*.ts', 'packages/shared/**/*.ts', 'apps/api/vitest.config.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // Web client: browser
  {
    files: ['apps/web/src/**/*.{ts,tsx}', 'apps/web/vite.config.ts'],
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      /**
       * Fetching client data on mount means awaiting a request and then calling
       * `setState` from an effect, which is the documented pattern for a client
       * without a framework loader. The rule is aimed at effects that only
       * synchronise state and flags data fetching as collateral damage.
       *
       * Every other react-hooks rule stays on, including `exhaustive-deps` and
       * `rules-of-hooks`, which are the ones that prevent real bugs.
       */
      'react-hooks/set-state-in-effect': 'off',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // shadcn/ui components intentionally export their variant helpers alongside
  // the component, which Fast Refresh does not support.
  {
    files: ['apps/web/src/components/ui/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },

  // Tests may be a little more relaxed about non-null assertions.
  {
    files: ['**/*.test.{ts,tsx}', '**/src/test/**'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
);
