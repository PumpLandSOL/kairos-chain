// Kairos web testnet: consensus primitives shared by the server, the server's mining worker and the browser miner.
// PoW digest and block id are bit-exact ports of noid_chain (consensus/pow.rs pow_header_fields_into +
// poseidon_pow_digest_from_fields; block_header.rs hash_block_header) built on the verified Poseidon2b port.
'use strict';
const K = typeof self !== 'undefined' && self.KairosKeys ? self.KairosKeys : require('./kairos-keys.js');
const I = K._internal, { Sponge, capacityIv, fromLE, toHex, fromHex } = I;
const u128 = (n) => { n = BigInt(n); return [Number(n & 0xffffffffn), Number((n >> 32n) & 0xffffffffn), Number((n >> 64n) & 0xffffffffn), Number((n >> 96n) & 0xffffffffn)]; };
const digestFields = (bytes32) => [fromLE(bytes32, 0), fromLE(bytes32, 16)];
// fields in pow.rs order; index 10 is the nonce
function powFields(h) {
  return [...digestFields(fromHex(h.prev_hash)), ...digestFields(fromHex(h.state_root)), ...digestFields(fromHex(h.tx_root)), u128(h.timestamp), u128(h.height),
    ...digestFields(fromHex(h.miner_hex)), u128(BigInt('0x' + (h.nonce_hex || '0'))), ...digestFields(fromHex(h.target)), u128(h.log_slots), u128(h.active_slot_count), u128(h.alloc_counter)];
}
function powDigestFields(f) { const s = new Sponge(capacityIv('POWHDR__')); for (let i = 0; i < 16; i += 2) s.absorbPair(f[i], f[i + 1]); return s.finalizeNoPad(); }
function powDigest(h) { return powDigestFields(powFields(h)); }
function blockId(h) { const s = new Sponge(capacityIv('BLOCKHDR')), f = powFields(h); for (const x of f) s.absorb(x); return s.finalize(); }
// little-endian 256-bit comparison (difficulty.rs le256_lt): strictly less
function le256lt(a, b) { for (let i = 31; i >= 0; i--) { if (a[i] !== b[i]) return a[i] < b[i]; } return false; }
const leToBig = (b) => { let n = 0n; for (let i = 31; i >= 0; i--) n = (n << 8n) | BigInt(b[i]); return n; };
const bigToLeHex = (n) => { const b = new Uint8Array(32); for (let i = 0; i < 32; i++) { b[i] = Number(n & 255n); n >>= 8n; } return toHex(b); };
// v2 ASERT (difficulty.rs next_target_with_schedule + target_from_exponent, BCH factor)
const BLOCK_TIME = 30, HALFLIFE = 6 * BLOCK_TIME;
function asert(anchorTargetHex, anchorHeight, anchorTs, height, parentTs, floorHex) {
  const actual = BigInt(Math.max(0, parentTs - anchorTs)), ideal = BigInt((height - 1 - anchorHeight) * BLOCK_TIME);
  const exp = ((actual - ideal) * 65536n) / BigInt(HALFLIFE); // i128 division truncates toward zero, like Rust
  const shifts = exp >> 16n, frac = exp - shifts * 65536n;
  const factor = 65536n + ((195766423245049n * frac + 971821376n * frac * frac + 5127n * frac * frac * frac + (1n << 47n)) >> 48n);
  let t = leToBig(fromHex(anchorTargetHex)) * factor, net = shifts - 16n; t = net >= 0n ? t << net : t >> -net;
  const floor = leToBig(fromHex(floorHex)); if (t > floor) t = floor; if (t < 1n) t = 1n; return bigToLeHex(t);
}
const leadingZeroBits = (hex) => { const n = leToBig(fromHex(hex)); return 256 - n.toString(2).length; };
const TN = { K, I, u128, powFields, powDigestFields, powDigest, blockId, le256lt, leToBig, bigToLeHex, asert, leadingZeroBits, BLOCK_TIME };
if (typeof module !== 'undefined' && module.exports) module.exports = TN; else self.TN = TN;
