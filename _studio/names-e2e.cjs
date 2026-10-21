const K = require('../client/kairos-keys.js'), T = require('../client/tn-core.js'), B = 'http://localhost:8268';
const j = async (p, b) => (await fetch(B + p, b ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) } : {})).json();
let pass = 0, fail = 0; const ok = (c, m) => { c ? pass++ : fail++; console.log(c ? '✓' : '✗', m); };
async function mine(to) { const tp = await j('/api/tn/template?miner=' + to); const f = T.powFields(tp.header), tgt = T.I.fromHex(tp.header.target); for (let n = 0n; ; n++) { f[10] = T.u128(n); if (T.le256lt(T.powDigestFields(f), tgt)) return j('/api/tn/submit', { id: tp.id, nonce: n.toString(16) }); } }
const W = (M) => ({ M, i: 0, a() { return K.address(M, this.i); }, async op(o) { const r = await j('/api/tn/op', { secret: K.spendSecret(M, this.i), next: K.address(M, this.i + 1), op: o }); if (r.error) return r; this.i++; await mine(K.address(K.randomMaster(), 0)); const tx = await j('/api/explorer/tx/' + r.txid); return tx.result; } });
const bal = async (a) => BigInt((await j('/api/tn/address/' + a)).balance);
(async () => { const A = W(K.randomMaster()), Bw = W(K.randomMaster()); for (let i = 0; i < 2; i++) { await mine(A.a()); await mine(Bw.a()); }
  let r = await A.op({ type: 'regName', name: 'satoshi' }); ok(r.ok, 'register: ' + (r.note || r.error));
  let n = await j('/api/tn/name/satoshi.kairos'); ok(n.owner === A.a(), 'name resolves to current (rotated) address');
  ok((await j('/api/tn/op', { secret: K.spendSecret(Bw.M, Bw.i), next: K.address(Bw.M, Bw.i + 1), op: { type: 'regName', name: 'satoshi' } })).error, 'duplicate name rejected');
  ok((await j('/api/tn/op', { secret: K.spendSecret(Bw.M, Bw.i), next: K.address(Bw.M, Bw.i + 1), op: { type: 'regName', name: '-x' } })).error, 'bad name rejected');
  r = await A.op({ type: 'regName', name: 'nakamoto' }); ok(r.ok, 'second name: ' + (r.note || r.error)); n = await j('/api/tn/name/satoshi'); ok(n.owner === A.a(), 'name followed owner after another spend');
  r = await A.op({ type: 'transferName', name: 'satoshi', to: Bw.a() }); ok(r.ok, 'transfer: ' + (r.note || r.error));
  n = await j('/api/tn/name/satoshi'); ok(n.owner === Bw.a(), 'resolves to new owner');
  ok((await j('/api/tn/names?owner=' + Bw.a())).names.length === 1, 'listed under new owner');
  console.log(pass + '/' + (pass + fail)); process.exit(fail ? 1 : 0); })().catch((e) => { console.log('ERR', e); process.exit(1); });
