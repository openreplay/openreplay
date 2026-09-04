import { createRequire } from 'node:module';
import { URL, fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const tsJest = require.resolve('ts-jest');
const babelJest = require.resolve('babel-jest');
const jsdomEnvironment = require.resolve('jest-environment-jsdom');
const frontendDir = fileURLToPath(new URL('.', import.meta.url));

export default {
  testEnvironment: jsdomEnvironment,
  rootDir: '..',
  roots: ['<rootDir>/frontend'],
  moduleNameMapper: {
    '^Shared/AnimatedSVG/AnimatedSVG$':
      '<rootDir>/frontend/tests/mocks/AnimatedSVGMock.tsx',
    '^Types/(.+)$': '<rootDir>/frontend/app/types/$1',
    '^App/(.+)$': '<rootDir>/frontend/app/$1',
    '\\.(css|less)$': '<rootDir>/frontend/tests/mocks/style.mock.js',
    '^@/(.*)$': '<rootDir>/frontend/app/$1',
    '^Player/(.+)$': '<rootDir>/player/src/$1',
    '^Player$': '<rootDir>/player/src',
    '^UI/(.+)$': '<rootDir>/frontend/app/components/ui/$1',
    '^UI$': '<rootDir>/frontend/app/components/ui',
    '^Shared/(.+)$': '<rootDir>/frontend/app/components/shared/$1',
    '\\.svg$': '<rootDir>/frontend/tests/mocks/svgMock.js',
    '^Components/(.+)$': '<rootDir>/frontend/app/components/$1',
  },
  verbose: true,
  collectCoverageFrom: [
    '<rootDir>/player/src/**/*.{ts,tsx,js,jsx}',
    '<rootDir>/frontend/app/mstore/**/*.{ts,tsx,js,jsx}',
    '<rootDir>/frontend/app/utils/**/*.{ts,tsx,js,jsx}',
    '!<rootDir>/**/*.d.ts',
    '!<rootDir>/**/node_modules/**',
  ],
  coverageDirectory: '<rootDir>/frontend/coverage',
  transform: {
    '^.+\\.(ts|tsx)?$': [
      tsJest,
      {
        tsconfig: `${frontendDir}tsconfig.json`,
        diagnostics: { warnOnly: true },
      },
    ],
    '^.+\\.(js|jsx)$': [
      babelJest,
      { configFile: `${frontendDir}jest-babel.config.cjs` },
    ],
  },
  moduleDirectories: ['node_modules'],
  transformIgnorePatterns: [
    '/node_modules/(?!(@medv/finder|syncod|modern-tar|@ant-design)/)',
  ],
  setupFiles: ['<rootDir>/frontend/tests/unit/jest.setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/tests/playwright/'],
};
