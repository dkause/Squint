/**
 * Minimaler SMTP-Sink für E2E-Tests
 * Akzeptiert SMTP-Verbindungen auf Port 2525 und sammelt Mail-Inhalte
 */

import { createServer, Server } from 'node:net';

interface SmtpSink {
  server: Server;
  receivedMails: string[];
  close: () => Promise<void>;
}

/**
 * Erstellt einen minimalen SMTP-Sink-Server
 * Antwortet auf SMTP-Kommandos und sammelt DATA-Inhalte
 */
export function createSmtpSink(port: number = 2525): SmtpSink {
  const receivedMails: string[] = [];
  let currentMailData: string[] = [];
  let currentConnectionState: 'waiting' | 'data' = 'waiting';

  const server = createServer((socket) => {
    let buffer = '';

    socket.on('data', (data) => {
      buffer += data.toString('utf8');
      processBuffer(socket, buffer);
    });

    socket.on('error', (err: Error) => {
      console.error('SMTP-Sink error:', err.message);
    });

    function processBuffer(sock: { write: (data: string) => void }, data: string): void {
      const lines = data.split('\r\n');
      buffer = lines.pop() || ''; // Letzte unvollständige Zeile behalten

      for (const line of lines) {
        const trimmed = line.trim();
        
        if (currentConnectionState === 'data') {
          // In DATA-Modus: sammle alle Zeilen
          if (trimmed === '.') {
            // Ende der DATA
            const mailContent = currentMailData.join('\n');
            receivedMails.push(mailContent);
            currentMailData = [];
            currentConnectionState = 'waiting';
            sock.write('250 OK\r\n');
          } else if (trimmed.startsWith('.')) {
            // Zeile beginnt mit Punkt - escape
            currentMailData.push(trimmed.slice(1));
          } else {
            currentMailData.push(trimmed);
          }
        } else {
          // Normaler SMTP-Modus
          if (trimmed === '' || trimmed.startsWith('EHLO') || trimmed.startsWith('HELO')) {
            sock.write('250 Hello\r\n');
          } else if (trimmed.startsWith('MAIL FROM:')) {
            sock.write('250 OK\r\n');
          } else if (trimmed.startsWith('RCPT TO:')) {
            sock.write('250 OK\r\n');
          } else if (trimmed === 'DATA') {
            currentConnectionState = 'data';
            sock.write('354 Start mail input; end with <CRLF>.<CRLF>\r\n');
          } else if (trimmed === 'QUIT') {
            sock.write('221 Bye\r\n');
            sock.end();
          } else if (trimmed === 'RSET') {
            currentMailData = [];
            currentConnectionState = 'waiting';
            sock.write('250 OK\r\n');
          } else {
            // Unbekanntes Kommando
            sock.write('500 Unknown command\r\n');
          }
        }
      }
    }

    socket.on('end', () => {
      // Verbindung geschlossen
    });

    // Willkommensnachricht
    socket.write('220 SMTP-Sink ready\r\n');
  });

  server.on('error', (err) => {
    console.error('SMTP-Sink server error:', err.message);
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`SMTP-Sink läuft auf Port ${port}`);
  });

  return {
    server,
    receivedMails,
    close: async () => {
      return new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    },
  };
}

/**
 * Erstellt einen globalen SMTP-Sink für Playwright globalSetup
 */
export function createGlobalSmtpSink(): SmtpSink {
  // Port 2525 ist der Standard für Test-SMTP
  return createSmtpSink(2525);
}
