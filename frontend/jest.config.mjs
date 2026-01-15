export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^Shared/AnimatedSVG/AnimatedSVG$': '<rootDir>/tests/mocks/AnimatedSVGMock.tsx',
    '^Types/(.+)$': '<rootDir>/app/types/$1',
    '^App/(.+)$': '<rootDir>/app/$1',
    "\\.(css|less)$": "<rootDir>/tests/mocks/style.mock.js",
    '^@/(.*)$': '<rootDir>/app/$1',
    '^Player/(.+)$': '<rootDir>/app/player/$1',
    '^Player$': '<rootDir>/app/player',
    '^UI/(.+)$': '<rootDir>/app/components/ui/$1',
    '^UI$': '<rootDir>/app/components/ui',
    '^Shared/(.+)$': '<rootDir>/app/components/shared/$1',
    '\\.svg$': '<rootDir>/tests/mocks/svgMock.js',
    '^Components/(.+)$': '<rootDir>/app/components/$1',
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
    '/node_modules/(?!(@medv/finder|syncod)/)',
  ],
  setupFiles: ['<rootDir>/tests/unit/jest.setup.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/playwright/'
  ],
};
