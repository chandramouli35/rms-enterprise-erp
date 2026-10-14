import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths to SSL certificates and dist folder
const distPath = path.resolve(__dirname, 'dist');
const certPath = path.resolve(__dirname, '../ssl/103_194_9_207_1627591350/103_194_9_207.crt');
const caPath = path.resolve(__dirname, '../ssl/103_194_9_207_1627591350/DigiCertCA.crt');
const keyPath = path.resolve(__dirname, '../ssl/IP.pvt');

// Basic MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

function serveFile(req, res) {
  let reqUrl = req.url.split('?')[0];
  let filePath = path.join(distPath, reqUrl);

  // Security check: prevent directory traversal
  if (!filePath.startsWith(distPath)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        // SPA Fallback: serve index.html for unknown routes
        fs.readFile(path.join(distPath, 'index.html'), (spaErr, spaData) => {
          if (spaErr) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(spaData);
        });
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });
}

// 1. Start HTTPS server on Port 443
try {
  const sslOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
    ca: fs.existsSync(caPath) ? fs.readFileSync(caPath) : undefined
  };

  https.createServer(sslOptions, (req, res) => {
    serveFile(req, res);
  }).listen(443, '0.0.0.0', () => {
    console.log('🔒 HTTPS Server running securely on https://103.194.9.207:443');
  });
} catch (e) {
  console.error('Failed to start HTTPS server:', e.message);
}

// 2. Start HTTP server on Port 80 to automatically redirect to HTTPS
http.createServer((req, res) => {
  // If requesting SSL validation, allow it directly without redirect
  if (req.url.startsWith('/.well-known/')) {
    serveFile(req, res);
    return;
  }
  const host = req.headers.host ? req.headers.host.split(':')[0] : '103.194.9.207';
  res.writeHead(301, { Location: `https://${host}${req.url}` });
  res.end();
}).listen(80, '0.0.0.0', () => {
  console.log('🌐 HTTP Server running on Port 80 (redirects to HTTPS 443)');
});
