import js from '@eslint/js';
import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import importPlugin from 'eslint-plugin-import';
import path from 'path';
import { fileURLToPath } from 'url';
import pluginJest from 'eslint-plugin-jest';
import i18next from 'eslint-plugin-i18next';
import globals from 'globals'; // You might need to install this package

// mimic CommonJS variables -- not needed if using CommonJS
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    ignores: [
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.test.js',
      '**/__tests__/**',
      '**/*.min.js'
    ],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
        project: './tsconfig.json',
      },
      // Add this to define environments
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': ts,
      react,
      'react-hooks': reactHooks,
      // 'jsx-a11y': jsxA11y,
      import: importPlugin,
      jest: pluginJest,
      i18next,
      prettierPlugin,
    },
    settings: {
      'import/resolver': {
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
        typescript: {},
      },
      react: {
        version: 'detect',
      },
    },
    rules: {
      // TypeScript rules
      ...ts.configs['recommended'].rules,

      // React rules
      ...react.configs.recommended.rules,
      'react/prop-types': 'off',

      // React Hooks rules
      ...reactHooks.configs.recommended.rules,

      // JSX accessibility rules
      // ...jsxA11y.configs.recommended.rules,

      // Import rules
      ...importPlugin.configs.recommended.rules,
      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: [
            '**/*.test.ts',
            '**/*.test.tsx',
            '**/*.spec.ts',
            '**/*.spec.tsx',
          ],
        },
      ],

      // i18next rules
      'i18next/no-literal-string': 'warn',
      'prettierPlugin/prettier': 'warn',

      // General rules
      'no-console': 'off', // Change from 'warn' to 'off' if you want to allow console statements
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      // should be turned on later
      'import/no-named-as-default-member': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-useless-escape': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',

      'react/display-name': 'off',
      'no-case-declarations': 'off',
      'no-prototype-builtins': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-empty': 'off',
      '@typescript-eslint/no-this-alias': 'off',
      'no-constant-binary-expression': 'off',
      'no-useless-catch': 'off',
      '@typescript-eslint/no-this-alias': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      'no-fallthrough': 'off',
      'react-hooks/exhaustive-deps': 'off',
      // 'no-undef': 'off',
      'import/namespace': 'off',
      'no-async-promise-executor': 'off',
      'import/no-unresolved': 'off',
      'no-dupe-keys': 'off',
      'import/named': 'off',
      'react/jsx-key': 'off',
      'react/jsx-no-duplicate-props': 'off',
      'react/no-unknown-property': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      'react/no-find-dom-node': 'off',
      'import/no-named-as-default': 'off',
      'import/no-extraneous-dependencies': 'off',
      'react-hooks/rules-of-hooks': 'off',
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'off',
      'react/no-children-prop': 'off',
    },
  },
  {
    files: [
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.test.js',
      '**/*.test.jsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/*.spec.js',
      '**/*.spec.jsx',
      '**/__tests__/**/*.ts',
      '**/__tests__/**/*.tsx',
      '**/__tests__/**/*.js',
      '**/__tests__/**/*.jsx',
    ],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        ...globals.jest,
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': ts,
      react,
      'react-hooks': reactHooks,
      jest: pluginJest,
    },
    rules: {
      ...pluginJest.configs.recommended.rules,
      'jest/no-disabled-tests': 'warn',
      'jest/no-focused-tests': 'error',
      'jest/no-identical-title': 'error',
      'jest/prefer-to-have-length': 'warn',
      'jest/valid-expect': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-undef': 'off', // Turn off no-undef for test files since Jest globals are handled
    },
  },
  // Apply prettier as last to override other formatting rules
  prettierConfig,
];