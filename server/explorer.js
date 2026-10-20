// Read-only explorer API over a Kairos node's JSON-RPC.
// Runs next to a node (KAIROS_RPC=http://127.0.0.1:9701): loopback gets owner scope, so this module only ever
// calls the read methods listed in READ and never forwards arbitrary methods. Without KAIROS_RPC it reports offline.
'use strict';
const RPC = process.env.KAIROS_RPC || '', TOKEN = process.env.KAIROS_RPC_TOKEN || '', PREFIX = process.env.KAIROS_RPC_PREFIX || 'paranoid_';
const READ = new Set(['getChainInfo', 'getMiningInfo', 'getPeerCount', 'getBlockDetails', 'getBlockHash', 'getTx', 'getRecentTransactions', 'getHistoryStepTerminal', 'getStateInfo', 'getNodeStatus']);
let id = 0;
async function call(method, params = []) {
  if (!READ.has(method)) throw new Error('method not allowed');
  const r = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json', ...(TOKEN ? { authorization: 'Bearer ' + TOKEN } : {}) }, body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method: PREFIX + method, params }), signal: AbortSignal.timeout(8000) });
  const j = await r.json(); if (j.error) throw new Error(j.error.message || 'rpc error'); return j.result;
}
// header cache + miner leaderboard (headers are immutable below the 18-block finality window)
const H = new Map(), FINAL = 18; let tip = 0, scanned = 0, lastSum = null, lastSumAt = 0;
async function header(h) { if (H.has(h)) return H.get(h); const d = await call('getBlockDetails', [h]); if (!d) return null; const x = { ...d.header, txs: d.retained ? (d.retained.transactions || d.retained.txs || []).length : null }; if (h <= tip - FINAL) H.set(h, x); return x; }
async function scan() { // fill the leaderboard cache in the background, oldest first, bounded per tick
  if (!RPC) return; try { const ci = await call('getChainInfo'); tip = ci.height; const stop = Math.min(tip - FINAL, scanned + 400); for (let h = scanned + 1; h <= stop; h++) { await header(h); scanned = h; } } catch {} }
if (RPC) { scan(); setInterval(scan, 15000); }
function board() { const m = new Map(); for (const [, x] of H) m.set(x.miner, (m.get(x.miner) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 50).map(([miner, blocks], i) => ({ rank: i + 1, miner, blocks, share: blocks / Math.max(1, H.size) })); }
async function summary() { if (lastSum && Date.now() - lastSumAt < 4000) return lastSum;
  const [ci, mi, peers, term] = await Promise.all([call('getChainInfo'), call('getMiningInfo'), call('getPeerCount').catch(() => null), call('getHistoryStepTerminal').catch(() => null)]);
  const recent = []; for (let h = ci.height; h > Math.max(0, ci.height - 12); h--) { const x = await header(h); if (x) recent.push(x); }
  const gaps = recent.slice(0, -1).map((x, i) => x.timestamp - recent[i + 1].timestamp), avg = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : null;
  lastSum = { online: true, height: ci.height, bestHash: ci.best_hash, supply: ci.circulating_supply_micronoid, activeSlots: ci.active_slot_count, logSlots: ci.log_slots, difficultyBits: mi.difficulty_bits, reward: mi.block_reward_micronoid, peers, terminalBytes: term ? term.length / 2 : null, avgBlockSec: avg, recent };
  lastSumAt = Date.now(); return lastSum; }
module.exports = async function route(p, u, send) {
  if (!p.startsWith('/api/explorer')) return false;
  if (!RPC) return send(200, { online: false }), true;
  try {
    if (p === '/api/explorer/summary') return send(200, await summary()), true;
    if (p === '/api/explorer/miners') return send(200, { scannedTo: scanned, tip, miners: board() }), true;
    let m;
    if ((m = p.match(/^\/api\/explorer\/block\/(\d+)$/))) { const d = await call('getBlockDetails', [+m[1]]); return send(d ? 200 : 404, d || { error: 'not found' }), true; }
    if ((m = p.match(/^\/api\/explorer\/tx\/([0-9a-f]{64})$/))) { const d = await call('getTx', [m[1]]); return send(d ? 200 : 404, d || { error: 'not found' }), true; }
    if ((m = p.match(/^\/api\/explorer\/address\/(k1[02-9ac-hj-np-z]{20,90})$/))) { const page = Math.max(0, +u.searchParams.get('page') || 0); return send(200, await call('getRecentTransactions', [page, 25, m[1]])), true; }
    if (p === '/api/explorer/txs') { const page = Math.max(0, +u.searchParams.get('page') || 0); return send(200, await call('getRecentTransactions', [page, 25, null])), true; }
    return send(404, { error: 'unknown endpoint' }), true;
  } catch (e) { return send(502, { online: false, error: String(e.message || e) }), true; }
};
