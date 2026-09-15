/** @type {import('ts-jest').JestConfigWithTsJest} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  // .js file extension fix
  moduleNameMapper: {
    '(.+)\\.js': '$1',
  },
  transform: {
    // ESM-only deps (error-stack-parser-es) ship .mjs; tsc always emits ESM for
    // .mjs regardless of `module`, so babel has to downlevel them to CJS.
    '^.+\\.mjs$': [
      'babel-jest',
      { plugins: ['@babel/plugin-transform-modules-commonjs'], babelrc: false, configFile: false },
    ],
    '^.+\\.m?[tj]sx?$': [
      'ts-jest',
      {
        tsconfig: {
          target: 'es2020',
          lib: ['DOM', 'ES2022'],
          allowJs: true,
        },
      },
    ],
  },
  // bun nests real packages under node_modules/.bun/<pkg>@<ver>/node_modules/<pkg>,
  // so the allowlist has to look ahead past the whole rest of the path.
  transformIgnorePatterns: ['/node_modules/(?!.*error-stack-parser-es)'],
}

export default config
