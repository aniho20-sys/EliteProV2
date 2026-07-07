/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testTimeout: 30000,
  // Each test file gets its own module registry so FIRESTORE_EMULATOR_HOST
  // is set before firebase-admin initializes.
  resetModules: true,
};
