// test double for a Kairos node's JSON-RPC (shapes from noid_rpc/src/types.rs) — used only to exercise the explorer UI locally
const http = require('http'), crypto = require('crypto'); const t0 = Math.floor(Date.now() / 1000) - 30 * 400;
const miners = ['k1qyfq8x3pn7w2l5c9h0r4dsum6tgz8ekv3jzq0w5n7y2xak4vprmsh9c3d', 'k1q8zt3wmc0v5n2hj7yxsl4kedq9r6a3pgu8f0vnc2wz5tlm7kys4hxd0e', 'k1qa7u0f3n9ycw5k2t8mzxv4hsr6ldp0ejq7g3nu9wc2zt5yk8mvfa1x4r'];
const H = (h) => crypto.createHash('sha256').update('b' + h).digest('hex');
const tip = () => 400 + Math.floor((Date.now() / 1000 - t0 - 400 * 30) / 30);
const hdr = (h) => ({ height: h, hash: H(h), prev_hash: H(h - 1), state_root: H('s' + h), tx_root: H('t' + h), timestamp: t0 + h * 30 + (h % 5), miner: miners[(h * 7) % 3 === 0 ? 0 : h % 3], nonce_hex: H('n' + h).slice(0, 32), difficulty_target: 'ff'.repeat(28) + '00000000', log_slots: 24, active_slot_count: 40 + h * 2, alloc_counter: h * 3 });
const M = { paranoid_getChainInfo: () => ({ height: tip(), best_hash: H(tip()), difficulty_target: '00', active_slot_count: 40 + tip() * 2, log_slots: 24, circulating_supply_micronoid: String(tip() * 16e6) }),
  paranoid_getMiningInfo: () => ({ height: tip(), difficulty_bits: 22, difficulty_target: '00', block_reward_micronoid: 16e6, block_reward_noid: 16, active_slot_count: 1, matrix_cache_classes: [] }),
  paranoid_getPeerCount: () => 4, paranoid_getHistoryStepTerminal: () => 'ab'.repeat(913108),
  paranoid_getBlockDetails: ([h]) => (h > tip() || h < 1 ? null : { header: hdr(h), retained: null }), paranoid_getTx: () => null,
  paranoid_getRecentTransactions: ([p, n, a]) => ({ page: p, page_size: n, total: 0, total_pages: 0, tip_height: tip(), retained_from_height: tip() - 41, address: a, transactions: [] }) };
http.createServer((q, r) => { let b = ''; q.on('data', (c) => b += c); q.on('end', () => { const m = JSON.parse(b); r.end(JSON.stringify({ jsonrpc: '2.0', id: m.id, result: M[m.method] ? M[m.method](m.params) : null })); }); }).listen(9799, () => console.log('mock rpc 9799'));
