// launchpad end-to-end against a local web testnet (house miner off, easy target): node dex-e2e.cjs   (server on P, default 8267)
const K = require('../client/kairos-keys.js'), T = require('../client/tn-core.js'), B = 'http://localhost:' + (process.env.P || 8267);
const j = async (p, b) => { const r = await fetch(B + p, b ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) } : {}); return r.json(); };
let pass = 0, fail = 0; const ok = (c, m) => { c ? pass++ : fail++; console.log(c ? '✓' : '✗', m); };
async function mine(to) { const tp = await j('/api/tn/template?miner=' + to); const f = T.powFields(tp.header), tgt = T.I.fromHex(tp.header.target); for (let n = 0n; ; n++) { f[10] = T.u128(n); if (T.le256lt(T.powDigestFields(f), tgt)) { const r = await j('/api/tn/submit', { id: tp.id, nonce: n.toString(16) }); if (!r.ok) throw new Error(r.error); return r.height; } } }
const M = K.randomMaster(); let idx = 0; const A = (i) => K.address(M, i), S = (i) => K.spendSecret(M, i);
async function op(o) { const r = await j('/api/tn/op', { secret: S(idx), next: A(idx + 1), op: o }); if (r.error) return r; idx++; await mine(K.address(K.randomMaster(), 0)); const tx = await j('/api/explorer/tx/' + r.txid); return tx.result || tx; }
const bal = async () => BigInt((await j('/api/tn/address/' + A(idx))).balance);
const hold = async (id) => { const h = (await j('/api/tn/holdings/' + A(idx))).holdings.find((x) => x.id === id); return h ? BigInt(h.bal) : 0n; };
(async () => {
  for (let i = 0; i < 22; i++) await mine(A(0)); ok((await bal()) === 352_000_000n, 'mined 22 blocks → 352 KAIROS on wallet');
  let r = await op({ type: 'create', name: 'Orbit', ticker: 'ORBX', supply: '1000000', backing: '10', mode: 'launch', desc: 'test', color: '#79adff' });
  ok(r.ok, 'create launch token: ' + (r.note || r.error)); const id = r.asset; let a = await j('/api/tn/asset/' + id);
  ok(a.ticker === 'ORBX' && a.reserve === '10000000' && a.mode === 'launch' && !a.graduated, 'asset listed, 10 KAIROS backing reserved');
  ok((await bal()) === 352_000_000n - 11_000_000n - 7900n, 'creator paid reserve + 1 KAIROS fee + network fee (' + (await bal()) + ')');
  ok((await j('/api/tn/op', { secret: S(idx), next: A(idx + 1), op: { type: 'create', name: 'Dup', ticker: 'ORBX', supply: '1000' } })).error, 'duplicate ticker refused');
  r = await op({ type: 'buy', asset: id, kai: '50000000', min: '0' }); ok(r.ok, 'buy 50 KAIROS on the curve: ' + (r.note || r.error)); const t1 = await hold(id); ok(t1 > 0n, 'tokens moved to the new address: ' + Number(t1) / 1e6);
  a = await j('/api/tn/asset/' + id); ok(a.progress === 25, 'launch progress 25% (' + a.progress + ')');
  r = await op({ type: 'sell', asset: id, tok: (t1 / 2n).toString(), min: '0' }); ok(r.ok, 'sell half back to the curve: ' + (r.note || r.error));
  r = await op({ type: 'buy', asset: id, kai: '10000000', min: '999999999999999' }); ok(/price moved/.test(r.error || ''), 'limit protects the buyer (rejected before sending): ' + r.error);
  const before = await bal(); r = await op({ type: 'buy', asset: id, kai: '250000000', min: '0' }); a = await j('/api/tn/asset/' + id);
  ok(r.ok && a.graduated && a.pool && a.raised === '200000000', 'buy past the target → graduates into a pool (raised ' + Number(a.raised) / 1e6 + ')');
  ok(before - (await bal()) < 250_000_000n, 'overshoot refunded (' + Number(before - (await bal())) / 1e6 + ' KAIROS spent)');
  const t2 = await hold(id); r = await op({ type: 'sell', asset: id, tok: (t2 / 10n).toString(), min: '0' }); ok(r.ok, 'sell into the pool after graduation: ' + (r.note || r.error));
  r = await op({ type: 'addLiquidity', asset: id, kai: '5000000', tok: (t2 / 10n).toString() }); ok(r.ok, 'add liquidity: ' + (r.note || r.error));
  let lp = (await j('/api/tn/holdings/' + A(idx))).holdings.find((x) => x.id === id).lp; ok(lp && BigInt(lp) > 0n, 'LP shares follow the wallet');
  r = await op({ type: 'removeLiquidity', asset: id }); ok(r.ok, 'remove liquidity: ' + (r.note || r.error));
  const t3 = await hold(id), bb = await bal(); r = await op({ type: 'redeem', asset: id, tok: '1000000000' }); ok(r.ok && (await hold(id)) === t3 - 1_000_000_000n, 'redeem 1,000 tokens for backing: ' + (r.note || r.error));
  ok((await bal()) - bb === 10_000n - 5800n, 'backing paid 0.01 KAIROS (minus network fee)');
  r = await op({ type: 'create', name: 'Direct', ticker: 'DIRX', supply: '5000', backing: '10', mode: 'direct' }); ok(r.ok && (await hold(r.asset)) === 5_000_000_000n, 'direct issue: whole supply to creator');
  ok((await j('/api/tn/assets')).assets.length === 2, 'launchpad lists both tokens');
  console.log(pass + '/' + (pass + fail)); process.exit(fail ? 1 : 0); })().catch((e) => { console.log('ERR', e); process.exit(1); });
