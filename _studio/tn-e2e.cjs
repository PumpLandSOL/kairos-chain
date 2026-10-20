// web testnet end-to-end: blocks advance, faucet pays, a wallet spends to another address, retired address is refused
const K = require('../client/kairos-keys.js'), B = 'http://localhost:' + (process.env.P || 8265);
const j = async (p, b) => { const r = await fetch(B + p, b ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) } : {}); return r.json(); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let pass = 0, fail = 0; const ok = (c, m) => { c ? pass++ : fail++; console.log(c ? '✓' : '✗', m); };
(async () => { const m = K.randomMaster(), a0 = K.address(m, 0), a1 = K.address(m, 1), bob = K.address(K.randomMaster(), 0);
  let s = await j('/api/explorer/summary'); const h0 = s.height; console.log('height', h0);
  for (let i = 0; i < 60 && (await j('/api/explorer/summary')).height < Math.max(h0, 2); i++) await sleep(2000);
  s = await j('/api/explorer/summary'); ok(s.height >= 2, 'chain advances (height ' + s.height + ', avg ' + (s.avgBlockSec || 0).toFixed(1) + 's)');
  let f = await j('/api/tn/faucet', { to: a0 }); ok(f.ok, 'faucet accepted ' + (f.error || f.txid));
  ok((await j('/api/tn/faucet', { to: a0 })).error, 'faucet rate limit');
  for (let i = 0; i < 90; i++) { const a = await j('/api/tn/address/' + a0); if (BigInt(a.balance) > 0n) break; await sleep(2000); }
  let A = await j('/api/tn/address/' + a0); ok(A.balance === '25000000', 'a0 received 25 KAI (' + A.balance + ')');
  const fee = BigInt((await j('/api/tn/fee?in=1&out=2')).min), coin = A.coins[0], send = 10_000_000n;
  ok((await j('/api/tn/tx', { inputs: [{ slot: coin.slot, secret: K.spendSecret(K.randomMaster(), 0) }], outputs: [{ to: bob, amount: '1' }], fee: '99999' })).error, 'wrong secret rejected');
  ok((await j('/api/tn/tx', { inputs: [{ slot: coin.slot, secret: K.spendSecret(m, 0) }], outputs: [{ to: bob, amount: send.toString() }, { to: a1, amount: (BigInt(coin.amount) - send).toString() }], fee: '0' })).error, 'zero fee rejected');
  const t = await j('/api/tn/tx', { inputs: [{ slot: coin.slot, secret: K.spendSecret(m, 0) }], outputs: [{ to: bob, amount: send.toString() }, { to: a1, amount: (BigInt(coin.amount) - send - fee).toString() }], fee: fee.toString() }); ok(t.ok, 'send accepted ' + (t.error || t.txid));
  for (let i = 0; i < 90; i++) { const b = await j('/api/tn/address/' + bob); if (BigInt(b.balance) > 0n) break; await sleep(2000); }
  ok((await j('/api/tn/address/' + bob)).balance === '10000000', 'bob received 10 KAI');
  A = await j('/api/tn/address/' + a0); ok(A.retired && A.balance === '0', 'a0 retired after spending');
  ok((await j('/api/tn/address/' + a1)).balance === (25_000_000n - send - fee).toString(), 'change landed on a1');
  ok((await j('/api/tn/faucet', { to: a0 })).error, 'retired address refused');
  const tx = await j('/api/explorer/tx/' + t.txid); ok(tx.height > 0, 'explorer finds tx at height ' + tx.height);
  const mn = await j('/api/explorer/miners'); ok(mn.miners.length >= 1, 'leaderboard ' + mn.miners.length);
  console.log(pass + '/' + (pass + fail)); process.exit(fail ? 1 : 0); })();
