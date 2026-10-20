// Kairos Chain website: dependency-free static server. node server/index.js  (PORT, default 8262)
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const PORT = +process.env.PORT || 8262, CLIENT = path.join(__dirname, '..', 'client');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.pdf': 'application/pdf', '.json': 'application/json', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.woff2': 'font/woff2' };
const ROUTES = { '/': 'index.html', '/docs': 'docs.html', '/roadmap': 'roadmap.html', '/whitepaper': 'whitepaper.html', '/brand': 'brand.html' };
http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/healthz') { res.writeHead(200); return res.end('ok'); }
  const f = ROUTES[p.replace(/\/$/, '') || '/'] || p.slice(1), fp = path.join(CLIENT, path.normalize(f).replace(/^(\.\.[\/\\])+/, ''));
  if (!fp.startsWith(CLIENT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404, { 'content-type': 'text/html' }); return fs.createReadStream(path.join(CLIENT, '404.html')).pipe(res); }
  res.writeHead(200, { 'content-type': MIME[path.extname(fp)] || 'application/octet-stream', 'cache-control': /\.(png|pdf|mp4|woff2)$/.test(fp) ? 'public, max-age=86400' : 'no-cache' });
  fs.createReadStream(fp).pipe(res);
}).listen(PORT, () => console.log('Kairos Chain site on :' + PORT));
