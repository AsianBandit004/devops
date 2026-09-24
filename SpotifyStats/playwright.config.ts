import { defineConfig, devices } from '@playwright/test';
export default defineConfig({ testDir: './tests/e2e', use: { ...devices['Desktop Chrome'] }, webServer: { command: './node_modules/.bin/vite --host 127.0.0.1 --port 4173', port: 4173, reuseExistingServer: !process.env.CI } });
