// Kairos web testnet. A single-producer-of-record chain that anyone can mine from a browser.
// Real: k1 addresses (Poseidon2b), PoW digest + block id + ASERT (bit-exact ports), 30 s target, live-state slots
// with reuse, Tx8x2 shape (≤8 in / ≤2 out), Kairos fee schedule with the burned state-growth fee, 16 KAIROS reward.
// Not here (node testnet): recursive HistoryStep proofs and ZK spend capsules. Web-testnet spends authorize by
// revealing the spend secret of a one-time address; the address is retired after its first spend.
'use strict';
const fs = require('fs'), path = require('path'), { Worker } = require('worker_threads');
const T = require('../client/tn-core.js'), { K, I } = T, { toHex, fromHex, Sponge, capacityIv, compressWithTag, fromLE } = I;
let DATA = process.env.DATA_PATH || path.join(__dirname, '..', 'data');
try { fs.mkdirSync(DATA, { recursive: true }); fs.accessSync(DATA, fs.constants.W_OK); } catch { console.error('DATA_PATH ' + DATA + ' is not writable (is the disk mounted?); using ./data, the testnet will reset on redeploy'); DATA = path.join(__dirname, '..', 'data'); fs.mkdirSync(DATA, { recursive: true }); }
const FILE = path.join(DATA, 'testnet.json'), MU = 1_000_000n, REWARD = 16n * MU, GEN_TARGET = T.bigToLeHex(1n << 244n), DEPTH = 24;
const FEE = { base: 5000n, input: 100n, output: 700n, growth: 2500n }, FINAL = 18;
// ---------- persistent state ----------
let C;
function fresh() { const house = toHex(I.blake3.hash(Buffer.from('kairos-web-testnet-house:' + require('crypto').randomBytes(32).toString('hex'))).slice(0, 32));
  return { v: 1, genesisTs: Math.floor(Date.now() / 1000), blocks: [], slots: {}, free: [], next: 0, alloc: 0, revealed: {}, house, houseIdx: 0, faucet: {}, txIndex: {}, burned: '0' }; }
try { C = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { C = fresh(); }
let dirty = false; setInterval(() => { if (dirty) { dirty = false; fs.writeFile(FILE + '.tmp', JSON.stringify(C), (e) => { if (!e) fs.rename(FILE + '.tmp', FILE, () => {}); }); } }, 4000);
const addrHex = (k1) => { const v = K.validateAddress(k1); if (!v.valid) throw new Error('bad k1 address'); return v.hex; };
const k1 = (hex) => K.encodeAddress(fromHex(hex));
// ---------- sparse Merkle state root (Poseidon2b, depth 24) ----------
const ZERO = [new Uint8Array(32)]; for (let d = 1; d <= DEPTH; d++) ZERO[d] = compressWithTag('EXSTNOD_', ZERO[d - 1], ZERO[d - 1]);
const nodes = new Map(); // key `${depth}:${index}` → Uint8Array, depth 0 = leaves
function leafHash(s) { const sp = new Sponge(capacityIv('EXSTSLT_')); sp.absorb(T.u128(s.amount)); sp.absorb(T.u128(s.cid)); const o = fromHex(s.owner); sp.absorbPair(fromLE(o, 0), fromLE(o, 16)); return sp.finalize(); }
const node = (d, i) => nodes.get(d + ':' + i) || ZERO[d];
function setLeaf(i, s) { let h = s ? leafHash(s) : ZERO[0]; nodes.set('0:' + i, h); for (let d = 1; d <= DEPTH; d++) { const p = i >> d, l = node(d - 1, p * 2), r = node(d - 1, p * 2 + 1); h = compressWithTag('EXSTNOD_', l, r); nodes.set(d + ':' + p, h); } }
const root = () => toHex(node(DEPTH, 0));
for (const [i, s] of Object.entries(C.slots)) setLeaf(+i, s);
// ---------- helpers ----------
const tip = () => C.blocks[C.blocks.length - 1] || null, height = () => C.blocks.length; // genesis = block 0 at index 0
const liveCount = () => Object.keys(C.slots).length;
const bal = (owner) => Object.entries(C.slots).filter(([, s]) => s.owner === owner).map(([i, s]) => ({ slot: +i, amount: s.amount }));
function minFee(nIn, nOut) { const growth = BigInt(Math.max(0, nOut - nIn)), occ = liveCount() / 2 ** DEPTH, pressure = occ >= .9 ? 8n : occ >= .75 ? 4n : occ >= .5 ? 2n : 1n;
  return { min: FEE.base + FEE.input * BigInt(nIn) + FEE.output * BigInt(nOut) + FEE.growth * pressure * growth, burn: FEE.growth * pressure * growth }; }
function txid(tx) { const sp = new Sponge(capacityIv('BYTEHASH')); sp.update(new TextEncoder().encode(JSON.stringify([tx.inputs.map((x) => [x.slot, x.owner]), tx.outputs.map((o) => [o.owner, o.amount]), tx.fee, tx.nonce]))); return toHex(sp.finalize()); }
function allocSlot() { if (C.free.length) return C.free.shift(); return C.next++; }
// ---------- mempool + validation ----------
let mempool = [];
function checkTx(tx) {
  if (!tx || !Array.isArray(tx.inputs) || !Array.isArray(tx.outputs)) return 'malformed transaction';
  if (tx.inputs.length < 1 || tx.inputs.length > 8) return 'a page holds 1 to 8 inputs';
  if (tx.outputs.length < 1 || tx.outputs.length > 2) return 'a page holds 1 or 2 outputs';
  const seen = new Set(), pending = new Set(mempool.flatMap((m) => m.inputs.map((x) => x.slot))); let sumIn = 0n, sumOut = 0n;
  for (const x of tx.inputs) { const s = C.slots[x.slot]; if (!s) return `slot ${x.slot} is not live`; if (seen.has(x.slot) || pending.has(x.slot)) return `slot ${x.slot} is already being spent`; seen.add(x.slot);
    if (!/^[0-9a-f]{64}$/.test(x.secret || '')) return 'each input needs its 32-byte spend secret';
    if (toHex(I.deriveAddress(fromHex(x.secret))) !== s.owner) return `secret does not own slot ${x.slot}`; x.owner = s.owner; sumIn += BigInt(s.amount); }
  for (const o of tx.outputs) { try { o.owner = addrHex(o.to); } catch { return 'bad recipient address'; } if (C.revealed[o.owner]) return 'that address was already spent from and is retired; send to a fresh one'; const a = BigInt(o.amount); if (a <= 0n) return 'outputs must be positive'; o.amount = a.toString(); sumOut += a; }
  const fee = BigInt(tx.fee || 0), need = minFee(tx.inputs.length, tx.outputs.length); if (fee < need.min) return `fee too low: needs at least ${need.min} μKAIROS`;
  if (sumIn !== sumOut + fee) return `inputs (${sumIn}) must equal outputs (${sumOut}) + fee (${fee})`;
  tx.fee = fee.toString(); tx.burn = need.burn.toString(); tx.nonce = Date.now(); return null; }
function submitTx(raw) { const tx = { inputs: (raw.inputs || []).map((x) => ({ slot: +x.slot, secret: String(x.secret || '').toLowerCase() })), outputs: (raw.outputs || []).map((o) => ({ to: String(o.to || '').trim(), amount: String(o.amount) })), fee: String(raw.fee || 0) };
  const e = checkTx(tx); if (e) return { error: e }; tx.id = txid(tx); mempool.push(tx); return { ok: true, txid: tx.id, fee: tx.fee }; }
// ---------- block assembly ----------
function applyTxs(txs, minerHex, dry) { // returns new header bits; mutates state unless dry
  const S = dry ? { slots: { ...C.slots }, free: [...C.free], next: C.next, alloc: C.alloc } : C, writes = [];
  let fees = 0n; const alloc = () => (S.free.length ? S.free.shift() : S.next++);
  for (const tx of txs) { for (const x of tx.inputs) { delete S.slots[x.slot]; S.free.push(x.slot); writes.push(x.slot); } for (const o of tx.outputs) { const i = alloc(); S.slots[i] = { amount: o.amount, cid: ++S.alloc, owner: o.owner }; writes.push(i); o.slot = i; } fees += BigInt(tx.fee) - BigInt(tx.burn); S.free.sort((a, b) => a - b); }
  const cb = alloc(); S.slots[cb] = { amount: (REWARD + fees).toString(), cid: ++S.alloc, owner: minerHex, coinbase: 1 }; writes.push(cb);
  return { S, writes, fees, cb }; }
function stateRootAfter(S, writes) { // compute root with a scratch overlay, without touching the cache
  const over = new Map(); const get = (d, i) => over.get(d + ':' + i) || node(d, i);
  for (const w of new Set(writes)) { const s = S.slots[w]; let h = s ? leafHash(s) : ZERO[0]; over.set('0:' + w, h); for (let d = 1; d <= DEPTH; d++) { const p = w >> d; h = compressWithTag('EXSTNOD_', get(d - 1, p * 2), get(d - 1, p * 2 + 1)); over.set(d + ':' + p, h); } }
  return toHex(get(DEPTH, 0)); }
function txRoot(txs) { const sp = new Sponge(capacityIv('TX8X2___')); for (const t of txs) sp.update(fromHex(t.id)); return toHex(sp.finalize()); }
function nextTarget(ts) { const g = C.blocks[0], t = tip(); if (!g || height() < 2) return GEN_TARGET; return T.asert(GEN_TARGET, 0, g.timestamp, height(), t.timestamp, GEN_TARGET); }
const templates = new Map(); let tplSeq = 0;
function template(minerK1) { const minerHex = addrHex(minerK1); if (C.revealed[minerHex]) throw new Error('that address is retired (it has spent); mine to a fresh address'); const t = tip(), ts = Math.max(Math.floor(Date.now() / 1000), t ? t.timestamp + 1 : 0);
  const txs = mempool.slice(0, 62), { S, writes } = applyTxs(txs, minerHex, true);
  const h = { height: height(), prev_hash: t ? t.hash : '00'.repeat(32), state_root: stateRootAfter(S, writes), tx_root: txRoot(txs), timestamp: ts, miner_hex: minerHex, nonce_hex: '0', target: nextTarget(ts), log_slots: DEPTH, active_slot_count: Object.keys(S.slots).length, alloc_counter: S.alloc };
  const id = ++tplSeq; templates.set(id, { h, txs, at: Date.now() }); for (const [k, v] of templates) if (Date.now() - v.at > 120000) templates.delete(k);
  return { id, header: h }; }
function submitBlock(id, nonceHex) { const tp = templates.get(+id); if (!tp) return { error: 'stale template' };
  const t = tip(); if ((t ? t.hash : '00'.repeat(32)) !== tp.h.prev_hash) return { error: 'stale template: a block was already found' };
  if (!/^[0-9a-f]{1,32}$/.test(nonceHex || '')) return { error: 'bad nonce' };
  const h = { ...tp.h, nonce_hex: nonceHex.padStart(32, '0') }; const d = T.powDigest(h); if (!T.le256lt(d, fromHex(h.target))) return { error: 'digest is not below the target' };
  if (tp.txs.some((x) => !mempool.includes(x))) return { error: 'stale template' };
  const { writes, fees, cb } = applyTxs(tp.txs, h.miner_hex, false); for (const w of new Set(writes)) setLeaf(w, C.slots[w]);
  if (root() !== h.state_root) console.error('state root mismatch at', h.height);
  h.hash = toHex(T.blockId(h)); h.pow = toHex(d); h.miner = k1(h.miner_hex); h.txs = tp.txs.map((x) => ({ id: x.id, inputs: x.inputs.map((i) => ({ slot: i.slot, owner: k1(i.owner) })), outputs: x.outputs.map((o) => ({ slot: o.slot, owner: k1(o.owner), amount: o.amount })), fee: x.fee, burn: x.burn }));
  h.reward = (REWARD + fees).toString(); h.coinbase_slot = cb;
  for (const x of tp.txs) { for (const i of x.inputs) C.revealed[i.owner] = 1; C.txIndex[x.id] = h.height; C.burned = (BigInt(C.burned) + BigInt(x.burn)).toString(); }
  mempool = mempool.filter((x) => !tp.txs.includes(x)); C.blocks.push(h); templates.clear(); dirty = true; return { ok: true, height: h.height, hash: h.hash }; }
// ---------- genesis + house miner (keeps blocks flowing, funds the faucet) ----------
const houseAddr = (i) => K.address(C.house, i);
// genesis carries no work requirement (like the node's genesis, it is fixed, not mined against ASERT): target = max, nonce 0
if (!C.blocks.length) { const tp = template(houseAddr(0)); tp.header.target = 'ff'.repeat(32); const r = submitBlock(tp.id, '0'); if (r.error) throw new Error('genesis: ' + r.error); try { fs.writeFileSync(FILE, JSON.stringify(C)); } catch (e) { console.error('cannot persist testnet to', FILE, e.message); } }
let worker = null; const HOUSE = process.env.TESTNET_HOUSE_MINER !== '0';
let houseTimer = null; const HEADSTART = +process.env.TESTNET_HEADSTART_MS || 10000;
function houseMine() { if (!HOUSE) return; if (worker) { worker.terminate(); worker = null; } clearTimeout(houseTimer); houseTimer = setTimeout(houseStart, height() > 1 ? HEADSTART : 0); }
function houseStart() { const tp = template(houseAddr(C.houseIdx));
  worker = new Worker(path.join(__dirname, 'tn-worker.js'), { workerData: { header: tp.header, start: Math.floor(Math.random() * 2 ** 40) } });
  worker.on('message', (nonce) => { submitBlock(tp.id, nonce); }); }
let lastTip = null; setInterval(() => { const t = tip(); if (t.hash !== lastTip) { lastTip = t.hash; houseMine(); } }, 1000); houseMine();
setInterval(() => { if (mempool.length) houseMine(); }, 20000); // pick up new transactions
// ---------- faucet (spends the house's mined coins like any wallet) ----------
const FAUCET_AMT = 25n * MU, faucetIp = new Map();
function faucet(toK1, ip) { let to; try { to = addrHex(toK1); } catch { return { error: 'enter a valid k1 address' }; }
  if (C.revealed[to]) return { error: 'that address is retired; use a fresh one' };
  const now = Date.now(), last = Math.max(C.faucet[to] || 0, faucetIp.get(ip) || 0); if (now - last < 6 * 3600e3) return { error: 'one faucet drip per address every 6 hours' };
  // gather house coins from the oldest unspent house address
  for (let i = 0; i <= C.houseIdx; i++) { const a = toHex(I.deriveAddress(fromHex(K.spendSecret(C.house, i)))); if (C.revealed[a]) continue; const coins = bal(a).filter((c) => !mempool.some((m) => m.inputs.some((x) => x.slot === c.slot))).slice(0, 8);
    const sum = coins.reduce((s, c) => s + BigInt(c.amount), 0n), fee = minFee(coins.length, 2).min; if (sum < FAUCET_AMT + fee + 1n) continue;
    C.houseIdx = Math.max(C.houseIdx, i + 1); const change = houseAddr(C.houseIdx);
    const r = submitTx({ inputs: coins.map((c) => ({ slot: c.slot, secret: K.spendSecret(C.house, i) })), outputs: [{ to: toK1, amount: FAUCET_AMT.toString() }, { to: change, amount: (sum - FAUCET_AMT - fee).toString() }], fee: fee.toString() });
    if (r.error) return r; C.faucet[to] = now; faucetIp.set(ip, now); dirty = true; houseMine(); return { ...r, amount: FAUCET_AMT.toString() }; }
  return { error: 'the faucet is refilling from new blocks; try again in a minute' }; }
// ---------- read API ----------
const pub = (h) => ({ height: h.height, hash: h.hash, prev_hash: h.prev_hash, state_root: h.state_root, tx_root: h.tx_root, timestamp: h.timestamp, miner: h.miner, nonce_hex: h.nonce_hex, difficulty_target: h.target, pow: h.pow, log_slots: h.log_slots, active_slot_count: h.active_slot_count, alloc_counter: h.alloc_counter, reward: h.reward, txs: h.txs.length });
function summary() { const t = tip(), recent = C.blocks.slice(-12).reverse().map(pub), gaps = recent.slice(0, -1).map((x, i) => x.timestamp - recent[i + 1].timestamp);
  const supply = Object.values(C.slots).reduce((s, x) => s + BigInt(x.amount), 0n);
  return { online: true, mode: 'web', height: t.height, bestHash: t.hash, supply: supply.toString(), activeSlots: liveCount(), logSlots: DEPTH, difficultyBits: T.leadingZeroBits(nextTarget()), reward: REWARD.toString(), peers: null, terminalBytes: null, avgBlockSec: gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : null, mempool: mempool.length, burned: C.burned, recent }; }
function miners() { const house = new Set(Array.from({ length: C.houseIdx + 2 }, (_, i) => houseAddr(i))), m = new Map(); for (const b of C.blocks.slice(1)) { const k = house.has(b.miner) ? 'house' : b.miner; m.set(k, (m.get(k) || 0) + 1); }
  return { scannedTo: height() - 1, tip: height() - 1, miners: [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 50).map(([miner, blocks], i) => ({ rank: i + 1, miner: miner === 'house' ? houseAddr(C.houseIdx) : miner, blocks, house: miner === 'house' })) }; }
function address(a) { let hex; try { hex = addrHex(a); } catch { return null; } const coins = bal(hex), txs = [];
  for (let i = C.blocks.length - 1; i >= 0 && txs.length < 25; i--) { const b = C.blocks[i]; if (b.miner === a) txs.push({ height: b.height, kind: 'mined', amount: b.reward, ts: b.timestamp }); for (const t of b.txs) { const inn = t.inputs.some((x) => x.owner === a), out = t.outputs.filter((o) => o.owner === a); if (inn || out.length) txs.push({ height: b.height, kind: inn ? 'sent' : 'received', txid: t.id, amount: out.reduce((s, o) => s + BigInt(o.amount), 0n).toString(), ts: b.timestamp }); } }
  return { address: a, retired: !!C.revealed[hex], balance: coins.reduce((s, c) => s + BigInt(c.amount), 0n).toString(), coins, history: txs, pending: mempool.filter((m) => m.outputs.some((o) => o.owner === hex) || m.inputs.some((x) => x.owner === hex)).length }; }
module.exports = { template, submitBlock, submitTx, faucet, summary, miners, address, minFee: (i, o) => minFee(i, o).min.toString(),
  block: (h) => { const b = C.blocks[h]; return b ? { header: pub(b), transactions: b.txs } : null }, tx: (id) => { const h = C.txIndex[id]; if (h == null) { const m = mempool.find((x) => x.id === id); return m ? { pending: true, id } : null; } return { height: h, ...C.blocks[h].txs.find((t) => t.id === id) }; } };
