/* eslint-disable */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier',
  ],
  rules: {
    'no-empty': [
      'error',
      {
        allowEmptyCatch: true,
      },
    ],
    '@typescript-eslint/camelcase': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/unbound-method': 'off',
    '@typescript-eslint/prefer-readonly': 'warn',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unused-expressions': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/restrict-plus-operands': 'warn',
    '@typescript-eslint/no-unsafe-return': 'warn',
    'no-useless-escape': 'warn',
    'no-control-regex': 'warn',
    '@typescript-eslint/restrict-template-expressions': 'warn',
    '@typescript-eslint/no-useless-constructor': 'warn',
    '@typescript-eslint/no-this-alias': 'off',
    '@typescript-eslint/no-floating-promises': 'warn',
    'no-unused-expressions': 'off',
    '@typescript-eslint/no-useless-constructor': 'warn',
    'semi': ["error", "never"],
    'quotes': ["error", "single"],
    'comma-dangle': ["error", "always"]
  },
}; 
