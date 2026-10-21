const K = require('../client/kairos-keys.js'), T = require('../client/tn-core.js'), B = 'http://localhost:8268';
const j = async (p, b) => (await fetch(B + p, b ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) } : {})).json();
let pass = 0, fail = 0; const ok = (c, m) => { c ? pass++ : fail++; console.log(c ? '✓' : '✗', m); };
async function mine(to) { const tp = await j('/api/tn/template?miner=' + to); const f = T.powFields(tp.header), tgt = T.I.fromHex(tp.header.target); for (let n = 0n; ; n++) { f[10] = T.u128(n); if (T.le256lt(T.powDigestFields(f), tgt)) return j('/api/tn/submit', { id: tp.id, nonce: n.toString(16) }); } }
const W = (M) => ({ M, i: 0, a() { return K.address(M, this.i); }, async op(o) { const r = await j('/api/tn/op', { secret: K.spendSecret(M, this.i), next: K.address(M, this.i + 1), op: o }); if (r.error) return r; this.i++; await mine(K.address(K.randomMaster(), 0)); const tx = await j('/api/explorer/tx/' + r.txid); return tx.result; } });
const bal = async (a) => BigInt((await j('/api/tn/address/' + a)).balance);
(async () => { const A = W(K.randomMaster()), Bw = W(K.randomMaster()); for (let i = 0; i < 2; i++) { await mine(A.a()); await mine(Bw.a()); }
  let r = await A.op({ type: 'mintNft', name: 'Orbit #1', collection: 'Orbits', seed: 'a1b2c3d4e5f6', palette: 2 }); ok(r.ok, 'mint: ' + (r.note || r.error)); const id = r.asset;
  let n = (await j('/api/tn/nfts?owner=' + A.a())).nfts[0]; ok(n && n.id === id, 'NFT owned by creator wallet');
  r = await A.op({ type: 'listNft', nft: id, price: '5000000' }); ok(r.ok, 'list for 5 KAIROS: ' + (r.note || r.error));
  ok((await j('/api/tn/op', { secret: K.spendSecret(Bw.M, Bw.i), next: K.address(Bw.M, Bw.i + 1), op: { type: 'listNft', nft: id, price: '1' } })).error, 'non-owner cannot list');
  const sellerAddr = A.a(), before = await bal(sellerAddr);
  r = await Bw.op({ type: 'buyNft', nft: id, max: '5000000' }); ok(r.ok, 'buy: ' + (r.note || r.error));
  ok((await bal(sellerAddr)) - before === 5_000_000n, 'seller paid 5 KAIROS in the same block');
  n = (await j('/api/tn/nfts?owner=' + Bw.a())).nfts[0]; ok(n && n.id === id && !n.price && n.sales.length === 1, 'ownership moved to buyer, listing cleared, sale recorded');
  ok((await j('/api/tn/nfts?listed=1')).nfts.length === 0, 'marketplace empty after sale');
  console.log(pass + '/' + (pass + fail)); process.exit(fail ? 1 : 0); })().catch((e) => { console.log('ERR', e); process.exit(1); });
