/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  rootDir: './',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^Types/session/(.+)$': '<rootDir>/app/types/session/$1',
    '^App/(.+)$': '<rootDir>/app/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)?$': ['ts-jest', { isolatedModules: true, diagnostics: { warnOnly: true } }],
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  moduleDirectories: ['node_modules', 'app'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
};

//
// module.exports = {
//   globals: {
//     "ts-jest": {
//       tsConfig: "tsconfig.json",
//       diagnostics: true
//     },
//     NODE_ENV: "test"
//   },
//   moduleNameMapper: {
//     "^Types/(.+)$": "<rootDir>/app/types/$1"
//   },
//   moduleDirectories: ["node_modules", 'app'],
//   moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],

//   verbose: true
// };