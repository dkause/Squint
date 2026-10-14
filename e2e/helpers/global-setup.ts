/**
 * Global Setup für Playwright-Tests
 * Startet den SMTP-Sink-Server
 */

import { createSmtpSink } from './smtp-sink';

// Globaler SMTP-Sink
let smtpSink: ReturnType<typeof createSmtpSink>;

async function globalSetup(): Promise<void> {
  console.log('Global Setup: SMTP-Sink starten...');
  
  // SMTP-Sink starten
  smtpSink = createSmtpSink(2525);
  
  // Warten, bis der Server läuft
  await new Promise((resolve, reject) => {
    const checkServer = () => {
      try {
        const server = smtpSink.server;
        // @ts-expect-error - interne Eigenschaft prüfen
        if (server._handle || server.listening) {
          console.log('SMTP-Sink läuft auf Port 2525');
          clearTimeout(timeout);
          resolve(void 0);
        } else {
          setTimeout(checkServer, 100);
        }
      } catch (err) {
        clearTimeout(timeout);
        reject(err);
      }
    };
    
    // Timeout nach 5 Sekunden
    const timeout = setTimeout(() => {
      reject(new Error('SMTP-Sink konnte nicht gestartet werden'));
    }, 5000);
    
    checkServer();
  });
  
  // SMTP-Sink in globalem Objekt speichern für Tests
  (global as unknown as { smtpSink: unknown }).smtpSink = smtpSink;
}

export default globalSetup;
