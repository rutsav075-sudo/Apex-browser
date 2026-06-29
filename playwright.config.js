// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'unit',
      testMatch: /.*\.unit\.test\.js$/,
    },
    {
      name: 'e2e',
      testMatch: /.*\.e2e\.test\.js$/,
    },
  ],
});
