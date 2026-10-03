process.env.NODE_ENV = 'test';

/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  transform: {},
  setupFiles: ['<rootDir>/test/setupEnv.js'],
  globalSetup: '<rootDir>/test/globalSetup.js',
  globalTeardown: '<rootDir>/test/globalTeardown.js',
  testMatch: ['**/test/**/*.test.js'],
  testTimeout: 60_000,
  maxWorkers: 1,
  forceExit: true,
};

export default config;
