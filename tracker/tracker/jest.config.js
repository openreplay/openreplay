/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
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
