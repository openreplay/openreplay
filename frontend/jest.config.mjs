export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^Types/(.+)$': '<rootDir>/app/types/$1',
    '^App/(.+)$': '<rootDir>/app/$1',
    "\\.(css|less)$": "<rootDir>/tests/mocks/style.mock.js",
  },
  collectCoverage: true,
  verbose: true,
  collectCoverageFrom: [
    '<rootDir>/app/player/**/*.{ts,tsx,js,jsx}',
    '<rootDir>/app/mstore/**/*.{ts,tsx,js,jsx}',
    '<rootDir>/app/utils/**/*.{ts,tsx,js,jsx}',
    '!<rootDir>/app/**/*.d.ts',
    '!<rootDir>/node_modules',
  ],
  transform: {
    '^.+\\.(ts|tsx)?$': ['ts-jest', { isolatedModules: true, diagnostics: { warnOnly: true } }],
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  moduleDirectories: ['node_modules'],
  transformIgnorePatterns: [
    '/node_modules/(?!syncod)',
  ],
};
