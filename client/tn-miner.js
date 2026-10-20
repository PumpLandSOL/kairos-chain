// Kairos web-testnet browser miner (Web Worker): Poseidon2b PoW over the exact Kairos header field schedule
importScripts('/kairos-keys.js', '/tn-core.js');
let job = 0;
onmessage = (e) => { const { header, start, id } = e.data; const my = ++job, f = TN.powFields(header), target = TN.I.fromHex(header.target); let n = BigInt(start), done = 0, t0 = Date.now();
  const loop = () => { if (my !== job) return; for (let k = 0; k < 40; k++) { f[10] = TN.u128(n); if (TN.le256lt(TN.powDigestFields(f), target)) { postMessage({ found: n.toString(16), id, hashes: done + 1 }); return; } n++; done++; }
    if (Date.now() - t0 > 1000) { postMessage({ hashes: done }); done = 0; t0 = Date.now(); } setTimeout(loop, 0); };
  loop(); };
