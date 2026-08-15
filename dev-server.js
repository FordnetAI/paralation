// Tiny static server for Paralation + POST /shot to save canvas screenshots.
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = process.argv[2];
const SHOTDIR = process.argv[3];
// PORT env var wins so the harness can assign a free port; argv[4] and the
// 8321 default are kept for running this by hand.
const PORT = parseInt(process.env.PORT || process.argv[4] || '8321', 10);
if (!fs.existsSync(SHOTDIR)) fs.mkdirSync(SHOTDIR, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };

http.createServer((req, res) => {
  if (req.method === 'POST' && req.url.startsWith('/shot')) {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      const name = (req.url.split('?name=')[1] || 'shot').replace(/[^a-z0-9_-]/gi, '');
      const b64 = body.replace(/^data:image\/png;base64,/, '');
      fs.writeFileSync(path.join(SHOTDIR, name + '.png'), Buffer.from(b64, 'base64'));
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('saved ' + name);
    });
    return;
  }
  const url = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const file = path.join(ROOT, decodeURIComponent(url));
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT);
console.log('paralation dev server on ' + PORT);
