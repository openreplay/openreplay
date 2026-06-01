/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/tests/jest.setup.ts',],
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts',],
  // .js file extension fix
  moduleNameMapper: {
    '(.+)\\.js': '$1',
  },
}

export default config
