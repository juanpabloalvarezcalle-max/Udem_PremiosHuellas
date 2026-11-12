import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/Udem_PremiosHuellas/`,
    reducedMotion: 'reduce',   // sin animaciones: pruebas deterministas (hay una prueba aparte con animaciones)
    trace: 'retain-on-failure'
  },
  projects: [
    {
      name: 'escritorio',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 },
             launchOptions: { executablePath: process.env.CHROME_PATH } }
    },
    {
      name: 'movil',
      use: { ...devices['Pixel 7'], launchOptions: { executablePath: process.env.CHROME_PATH } }
    }
  ],
  webServer: {
    command: 'node tests/server.mjs',
    url: `http://localhost:${PORT}/Udem_PremiosHuellas/index.html`,
    reuseExistingServer: !process.env.CI,
    env: { PORT: String(PORT) }
  }
});
