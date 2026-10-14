/**
 * Global Teardown für Playwright-Tests
 * Stoppt den SMTP-Sink-Server
 */

async function globalTeardown(): Promise<void> {
  console.log('Global Teardown: SMTP-Sink stoppen...');
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const smtpSink = (global as any).smtpSink;
  
  if (smtpSink && smtpSink.close) {
    try {
      await smtpSink.close();
      console.log('SMTP-Sink wurde gestoppt');
    } catch (err) {
      console.error('Fehler beim Stoppen des SMTP-Sinks:', err);
    }
  }
}

export default globalTeardown;
