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
  transformIgnorePatterns: ['/node_modules/(?!error-stack-parser-es/)'],
}

export default config
