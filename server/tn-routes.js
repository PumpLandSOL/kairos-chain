// HTTP routes for the web testnet (used when no Kairos node RPC is configured)
'use strict';
let TN = null; const tn = () => TN || (TN = require('./testnet.js'));
const K1 = /^k1[02-9ac-hj-np-z]{20,90}$/;
function webExplorer(p, u, send) { const t = tn(); let m;
  if (p === '/api/explorer/summary') return send(200, t.summary()), true;
  if (p === '/api/explorer/miners') return send(200, t.miners()), true;
  if ((m = p.match(/^\/api\/explorer\/block\/(\d+)$/))) { const b = t.block(+m[1]); return send(b ? 200 : 404, b || { error: 'not found' }), true; }
  if ((m = p.match(/^\/api\/explorer\/tx\/([0-9a-f]{64})$/))) { const x = t.tx(m[1]); return send(x ? 200 : 404, x || { error: 'not found' }), true; }
  if ((m = p.match(/^\/api\/explorer\/address\/(.+)$/)) && K1.test(m[1])) { const a = t.address(m[1]); return send(a ? 200 : 400, a || { error: 'bad address' }), true; }
  return send(404, { error: 'unknown endpoint' }), true; }
const hits = new Map();
async function testnetRoute(p, u, send, req, body) { const t = tn(), ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const key = ip + p, now = Date.now(), recent = (hits.get(key) || []).filter((x) => now - x < 10000); recent.push(now); hits.set(key, recent); if (hits.size > 20000) hits.clear();
  if (recent.length > 40) return send(429, { error: 'slow down' }), true;
  try { let m;
    if (p === '/api/tn/template') return send(200, t.template(u.searchParams.get('miner') || '')), true;
    if (p === '/api/tn/fee') return send(200, { min: t.minFee(+u.searchParams.get('in') || 1, +u.searchParams.get('out') || 2) }), true;
    if ((m = p.match(/^\/api\/tn\/address\/(.+)$/)) && K1.test(m[1])) { const a = t.address(m[1]); return send(a ? 200 : 400, a || { error: 'bad address' }), true; }
    if (p === '/api/tn/headers') return send(200, t.headers(+u.searchParams.get('from') || 0, +u.searchParams.get('to') || 0)), true;
    if (p === '/api/tn/names') return send(200, { names: t.names({ owner: u.searchParams.get('owner') || '' }) }), true;
    if (p.startsWith('/api/tn/name/')) { const n = t.resolve(decodeURIComponent(p.slice(13))); return send(n ? 200 : 404, n || { error: 'name not registered' }), true; }
    if (p === '/api/tn/nfts') return send(200, { nfts: t.nfts({ owner: u.searchParams.get('owner') || '', listed: u.searchParams.get('listed') === '1' }) }), true;
    if (p === '/api/tn/assets') return send(200, { assets: t.assets() }), true;
    if ((m = p.match(/^\/api\/tn\/asset\/([0-9a-zA-Z]{2,24})$/))) { const a = t.asset(m[1]); return send(a ? 200 : 404, a || { error: 'unknown asset' }), true; }
    if ((m = p.match(/^\/api\/tn\/holdings\/(.+)$/)) && K1.test(m[1])) return send(200, { holdings: t.holdings(m[1]) || [] }), true;
    if (req.method !== 'POST') return send(404, { error: 'unknown endpoint' }), true;
    const b = await body();
    if (p === '/api/tn/submit') { const r = t.submitBlock(b.id, String(b.nonce || '')); return send(r.error ? 400 : 200, r), true; }
    if (p === '/api/tn/op') { const r = t.submitOp(b); return send(r.error ? 400 : 200, r), true; }
    if (p === '/api/tn/tx') { const r = t.submitTx(b); return send(r.error ? 400 : 200, r), true; }
    if (p === '/api/tn/faucet') { const r = t.faucet(String(b.to || ''), ip); return send(r.error ? 400 : 200, r), true; }
    return send(404, { error: 'unknown endpoint' }), true;
  } catch (e) { return send(400, { error: String(e.message || e) }), true; } }
module.exports = { webExplorer, testnetRoute };
