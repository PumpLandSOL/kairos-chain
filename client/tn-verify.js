// Kairos web-testnet chain verifier (Web Worker): re-checks every header with the same Poseidon2b code the miner uses
importScripts('/kairos-keys.js', '/tn-core.js');
const vFromHex = TN.I.fromHex, vToHex = TN.I.toHex;
onmessage = (e) => { const { headers, genTarget, prev } = e.data; let last = prev, gen = e.data.gen, out = [];
  for (const r of headers) { const [height, prev_hash, state_root, tx_root, timestamp, miner_hex, nonce_hex, target, log_slots, active_slot_count, alloc_counter, hash] = r;
    const h = { height, prev_hash, state_root, tx_root, timestamp, miner_hex, nonce_hex, target, log_slots, active_slot_count, alloc_counter };
    const errs = [];
    if (height === 0) { gen = { ts: timestamp }; if (prev_hash !== '00'.repeat(32)) errs.push('genesis parent'); }
    else { if (!last || prev_hash !== last.hash) errs.push('broken link to block ' + (height - 1)); if (last && timestamp <= last.ts) errs.push('timestamp not increasing');
      const want = height === 1 ? genTarget : TN.asert(genTarget, 0, gen.ts, height, last.ts, genTarget); if (want !== target) errs.push('difficulty target does not match ASERT');
      if (!TN.le256lt(TN.powDigest(h), vFromHex(target))) errs.push('proof of work digest not below target'); }
    if (vToHex(TN.blockId(h)) !== hash) errs.push('block id mismatch');
    out.push({ height, ok: !errs.length, errs, bits: TN.leadingZeroBits(target) }); last = { hash, ts: timestamp }; }
  postMessage({ out, last, gen }); };
