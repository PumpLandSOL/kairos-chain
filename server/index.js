// Kairos Chain website: dependency-free static server. node server/index.js  (PORT, default 8262)
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const PORT = +process.env.PORT || 8262, CLIENT = path.join(__dirname, '..', 'client');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.pdf': 'application/pdf', '.json': 'application/json', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.woff2': 'font/woff2' };
const explorer = require('./explorer');
const send = (res) => (code, obj) => { res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'cache-control': 'no-store' }); res.end(JSON.stringify(obj)); };
const ROUTES = { '/': 'index.html', '/docs': 'docs.html', '/roadmap': 'roadmap.html', '/whitepaper': 'whitepaper.html', '/brand': 'brand.html', '/sync': 'sync.html', '/wallet': 'wallet.html', '/playground': 'playground.html', '/explorer': 'explorer.html', '/mine': 'mine.html', '/launchpad': 'launchpad.html' };
http.createServer(async (req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/healthz') { res.writeHead(200); return res.end('ok'); }
  if (await explorer(p, new URL(req.url, 'http://x'), send(res), req, () => new Promise((ok, no) => { let d = ''; req.on('data', (c) => { d += c; if (d.length > 64000) { no(new Error('body too large')); req.destroy(); } }); req.on('end', () => { try { ok(JSON.parse(d || '{}')); } catch { no(new Error('bad json')); } }); }))) return;
  const f = ROUTES[p.replace(/\/$/, '') || '/'] || p.slice(1), fp = path.join(CLIENT, path.normalize(f).replace(/^(\.\.[\/\\])+/, ''));
  if (!fp.startsWith(CLIENT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404, { 'content-type': 'text/html' }); return fs.createReadStream(path.join(CLIENT, '404.html')).pipe(res); }
  res.writeHead(200, { 'content-type': MIME[path.extname(fp)] || 'application/octet-stream', 'cache-control': /\.(png|pdf|mp4|woff2)$/.test(fp) ? 'public, max-age=86400' : 'no-cache' });
  fs.createReadStream(fp).pipe(res);
}).listen(PORT, () => { console.log('Kairos Chain site on :' + PORT); if (!process.env.KAIROS_RPC) require('./testnet.js'); });
