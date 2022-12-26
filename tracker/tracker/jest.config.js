/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  // .js file extension fix
  moduleNameMapper: {
    '(.+)\\.js': '$1',
  },
}

export default config
