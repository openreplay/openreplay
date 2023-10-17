console.log(__dirname)
const dir = __dirname
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^Types/session/(.+)$': '<rootDir>/app/types/session/$1',
    '^App/(.+)$': '<rootDir>/app/$1',
  },
  collectCoverage: true,
  verbose: true,
  collectCoverageFrom: [
      // '<rootDir>/app/**/*.{ts,tsx,js,jsx}',
    '<rootDir>/app/player/**/*.{ts,tsx,js,jsx}',
    '<rootDir>/app/mstore/**/*.{ts,tsx,js,jsx}',
    '<rootDir>/app/utils/**/*.{ts,tsx,js,jsx}',

    '!<rootDir>/app/**/*.d.ts',
    '!<rootDir>/node_modules'
  ],
  transform: {
    '^.+\\.(ts|tsx)?$': ['ts-jest', { isolatedModules: true, diagnostics: { warnOnly: true } }],
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  moduleDirectories: ['node_modules'],
};
