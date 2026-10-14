import { defineConfig, devices } from '@playwright/test';

// WebServer-Konfiguration
const webServerConfig = {
  command: 'npm run build:client && tsx src/server.ts',
  url: 'http://localhost:8080',
  reuseExistingServer: false,
  timeout: 120000, // 2 Minuten für Build + Start
  env: {
    // Upload-Passwort für Tests
    SQUINT_UPLOAD_PASSWORD: 'e2epass',
    
    // Datenverzeichnis in Temp
    SQUINT_DATA_DIR: process.env.SQUINT_DATA_DIR || '/tmp/squint-e2e-data',
    
    // SMTP-Konfiguration für Test-Sink
    SQUINT_SMTP_HOST: '127.0.0.1',
    SQUINT_SMTP_PORT: '2525',
    SQUINT_SMTP_USER: 'e2e@localhost',
    SQUINT_SMTP_PASS: 'e2e',
    SQUINT_MAIL_FROM: 'squint@localhost',
    SQUINT_MAIL_TO: 'foto@localhost',
    
    // Port für Server
    PORT: '8080',
  },
};

export default defineConfig({
  // Test-Verzeichnis
  testDir: './e2e',
  
  // Parallelisierung
  fullyParallel: false,
  workers: 1,
  
  // Timeout-Einstellungen
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  
  // Browser-Konfiguration
  use: {
    // Handy-Viewport (iPhone 13)
    ...devices['iPhone 13'],
    
    // Basis-URL
    baseURL: 'http://localhost:8080',
    
    // Viewport explizit setzen
    viewport: { width: 390, height: 844 },
    
    // Mobile/Touch emulieren
    isMobile: true,
    hasTouch: true,
    
    // Screenshot bei Fehler
    screenshot: 'only-on-failure',
    
    // Video aufzeichnen (optional)
    video: 'retain-on-failure',
    
    // Trace aufzeichnen
    trace: 'on-first-retry',
  },
  
  // WebServer-Konfiguration
  webServer: {
    ...webServerConfig,
    reuseExistingServer: true,
  },
  
  // Global Setup/Teardown als Datei-Pfad
  globalSetup: './e2e/helpers/global-setup.ts',
  globalTeardown: './e2e/helpers/global-teardown.ts',
  
  // Reporter
  reporter: [
    ['list'],
    ['json', { outputFolder: 'test-results/json' }],
  ],
  
  // Output-Verzeichnis
  outputDir: 'test-results/',
});
