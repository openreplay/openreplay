/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  // Add more detailed coverage reporters for PR comments
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  // Optional: Add coverage thresholds if desired
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    }
  },
  // .js file extension fix
  moduleNameMapper: {
    '(.+)\\.js': '$1',
  },
  globals: {
    'ts-jest': {
      tsConfig: {
        target: 'es2020',
        lib: ['DOM', 'ES2022'],
      },
    },
  },
}

export default config