const K = require('../client/kairos-keys.js'), T = require('../client/tn-core.js'), B = 'http://localhost:8268';
const j = async (p, b, n = 0) => { try { return await (await fetch(B + p, b ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) } : {})).json(); } catch (e) { if (n > 5) throw e; await new Promise((r) => setTimeout(r, 500)); return j(p, b, n + 1); } };
async function mine(to) { const tp = await j('/api/tn/template?miner=' + to); const f = T.powFields(tp.header), tgt = T.I.fromHex(tp.header.target); for (let n = 0n; ; n++) { f[10] = T.u128(n); if (T.le256lt(T.powDigestFields(f), tgt)) return j('/api/tn/submit', { id: tp.id, nonce: n.toString(16) }); } }
const P = [['proofmaxi', 9, 2], ['quantumdegen', 7, 2], ['blockrunner', 6, 1], ['zk-anon', 5, 1], ['gmkairos', 4, 1], ['minerjoe', 3, 0]];
(async () => { let last = null;
  for (const [name, blocks, nfts] of P) { const M = K.randomMaster(); let i = 0; for (let b = 0; b < blocks; b++) await mine(K.address(M, 0));
    const op = async (o) => { const r = await j('/api/tn/op', { secret: K.spendSecret(M, i), next: K.address(M, i + 1), op: o }); if (r.error) return console.log(name, r.error); i++; await mine(K.address(M, i)); };
    await op({ type: 'regName', name }); for (let n = 0; n < nfts; n++) await op({ type: 'mintNft', name: name + ' #' + (n + 1), collection: 'Season', seed: require('crypto').randomBytes(8).toString('hex'), palette: n + 2 }); last = M; }
  require('fs').writeFileSync('shots/season-master.txt', last); console.log('seeded'); })();
