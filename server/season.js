// Testnet Season 1: points computed purely from chain history. Kairos rotates addresses on every spend, so a
// wallet is reconstructed by following each spend to its change output (union-find over the address chain).
'use strict';
const PTS = { mined: 10, send: 2, create: 50, buy: 3, sell: 3, redeem: 3, addLiquidity: 10, removeLiquidity: 2, mintNft: 15, listNft: 2, unlistNft: 0, buyNft: 10, regName: 20, transferName: 2 };
let cache = { h: -1, data: null };
function build(blocks, names, houseSet) {
  const P = new Map(), find = (a) => { while (P.has(a) && P.get(a) !== a) { const g = P.get(P.get(a)) || P.get(a); P.set(a, g); a = g; } return a; }, link = (a, b) => { if (!a || !b) return; const x = find(a), y = find(b); if (x !== y) P.set(x, y); };
  const ev = [];
  for (const b of blocks.slice(1)) {
    if (!houseSet.has(b.miner)) ev.push([b.miner, 'mined', b.height]);
    for (const t of b.txs || []) { const from = t.inputs[0] && t.inputs[0].owner; if (!from) continue;
      if (t.kind === 'op') { const nx = t.outputs.length ? t.outputs[t.outputs.length - 1].owner : null; link(from, nx); if (t.result && t.result.ok) ev.push([from, t.op.type, b.height]); }
      else { if (t.outputs.length === 2) link(from, t.outputs[1].owner); ev.push([from, 'send', b.height]); } } }
  const W = new Map(); for (const [a, k, h] of ev) { const r = find(a), w = W.get(r) || { pts: 0, blocks: 0, actions: 0, first: h, last: h }; w.pts += PTS[k] || 0; if (k === 'mined') w.blocks++; else w.actions++; w.last = h; W.set(r, w); }
  for (const n of names) { const r = find(n.owner); const w = W.get(r); if (w && (!w.name || n.h < w.nameH)) { w.name = n.name + '.kairos'; w.nameH = n.h; } }
  const board = [...W.entries()].map(([root, w]) => ({ root, label: w.name || root.slice(0, 12) + '…' + root.slice(-6), named: !!w.name, pts: w.pts, blocks: w.blocks, actions: w.actions })).sort((a, b) => b.pts - a.pts);
  board.forEach((x, i) => (x.rank = i + 1));
  return { board, find, total: board.reduce((s, x) => s + x.pts, 0), wallets: board.length };
}
function season(t, addr) {
  const h = t.height(); if (cache.h !== h) { cache = { h, data: build(t.blocks(), t.names({}), t.house()) }; }
  const d = cache.data; let me = null; if (addr) { const r = d.find(addr); me = d.board.find((x) => x.root === r) || { rank: null, pts: 0, blocks: 0, actions: 0, label: addr }; }
  return { season: 1, height: h, points: PTS, wallets: d.wallets, total: d.total, top: d.board.slice(0, 50).map(({ root, ...x }) => x), me: me && (({ root, ...x }) => x)(me) };
}
module.exports = { season };
