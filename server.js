/**
 * EverBright MIS — Simple Static File Server (no external deps)
 * Serves static files from public/ directory
 * Frontend connects directly to Firebase
 * Start: node server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
};

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.join(PUBLIC_DIR, urlPath);

  // Prevent directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA fallback: serve index.html for unknown routes
      if (err.code === 'ENOENT' && !urlPath.startsWith('/api/')) {
        const indexPath = path.join(PUBLIC_DIR, 'index.html');
        fs.readFile(indexPath, (e2, d2) => {
          if (e2) {
            res.writeHead(404);
            res.end('Not Found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(d2);
          }
        });
        return;
      }
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n  EverBright MIS Dev Server running at http://localhost:${PORT}`);
  console.log('  Test accounts (password: EverBright2026!):');
  console.log('     admin@everbright.co.nz    -> Admin');
  console.log('     manager@everbright.co.nz  -> Management');
  console.log('     james@everbright.co.nz    -> Adviser');
  console.log('     linda@everbright.co.nz    -> Adviser');
  console.log('     mike@everbright.co.nz     -> Adviser');
  console.log('     priya@everbright.co.nz    -> Adviser');
  console.log('     david@everbright.co.nz    -> Adviser\n');
});
