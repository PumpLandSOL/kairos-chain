/*
 * kairos-keys.js — dependency-free port of the Kairos Chain wallet key and
 * address derivation (browser <script> -> window.KairosKeys, Node -> require()).
 *
 * Source of truth (Rust, repo kairos-chain/publish/kairos):
 *   noid_core/src/tower/block{8,16,32,64,128}.rs   GF(2^128) binary tower field
 *   noid_poseidon2b/src/native/permutation.rs      Poseidon2b permutation
 *   noid_poseidon2b/src/native/domain.rs           capacity IVs / domain tags
 *   noid_poseidon2b/src/native/compression.rs      sponge + compress_with_tag
 *   noid_poseidon2b/src/primitives.rs              SpendSecret / derive_address / bech32m
 *   noid_node/src/wallet/keystore.rs               master -> spend secret(index)
 *   noid_gui/src/secret.rs                         Photo Key (BLAKE3 derive_key)
 *
 * Field elements are represented as 4 little-endian uint32 words
 * [w0, w1, w2, w3] == the Rust `Block128(u128)` value (w0 = bits 0..31).
 * Everything is computed in the TOWER basis, which is what Rust stores; the
 * Rust permutation internally hops to the flat/GCM basis
 * (permutation.rs:29-39) but its own test
 * `flat_permutation_matches_tower_reference` (permutation.rs:241-265) pins it
 * equal to the pure tower schedule implemented here.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.KairosKeys = api;
  else if (root) root.KairosKeys = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // -------------------------------------------------------------------------
  // GF(2^8), AES polynomial 0x11B  (block8.rs:4, 89-144)
  // -------------------------------------------------------------------------
  var MUL8 = new Uint8Array(65536);
  (function () {
    for (var a = 0; a < 256; a++) {
      for (var b = 0; b < 256; b++) {
        var p = 0;
        for (var i = 0; i < 8; i++) if ((b >> i) & 1) p ^= a << i;
        for (var bit = 14; bit >= 8; bit--) if ((p >> bit) & 1) p ^= 0x11b << (bit - 8);
        MUL8[(a << 8) | b] = p;
      }
    }
  })();
  function mul8(a, b) { return MUL8[(a << 8) | b]; }

  // Each level K -> 2K is F_K[X]/(X^2 + X + TAU_K), Karatsuba:
  //   c_lo = a0*b0 + a1*b1*TAU ; c_hi = a0*b0 + (a0+a1)*(b0+b1)
  // TAU_8 = 0x20 (block8.rs:46), TAU_16 = 0x2000 (block16.rs:292),
  // TAU_32 = 0x2000_0000 (block32.rs:20), TAU_64 = 0x2000_0000_0000_0000 (block64.rs:22).
  function mul16(a, b) { // block16.rs:359-381
    var a0 = a & 255, a1 = a >>> 8, b0 = b & 255, b1 = b >>> 8;
    var v0 = mul8(a0, b0), v1 = mul8(a1, b1), vs = mul8(a0 ^ a1, b0 ^ b1);
    return ((v0 ^ vs) << 8) | (v0 ^ mul8(v1, 0x20));
  }
  function mul32(a, b) { // block32.rs:84-101
    var a0 = a & 0xffff, a1 = a >>> 16, b0 = b & 0xffff, b1 = b >>> 16;
    var v0 = mul16(a0, b0), v1 = mul16(a1, b1), vs = mul16(a0 ^ a1, b0 ^ b1);
    return (((v0 ^ vs) << 16) | (v0 ^ mul16(v1, 0x2000))) >>> 0;
  }
  // 64-bit values as [lo32, hi32]
  function mul64(al, ah, bl, bh) { // block64.rs:84-101
    var v0 = mul32(al, bl), v1 = mul32(ah, bh), vs = mul32((al ^ ah) >>> 0, (bl ^ bh) >>> 0);
    return [(v0 ^ mul32(v1, 0x20000000)) >>> 0, (v0 ^ vs) >>> 0];
  }
  // 128-bit values as [w0,w1,w2,w3]
  function mul128(a, b) { // block128.rs:97-114
    var v0 = mul64(a[0], a[1], b[0], b[1]);
    var v1 = mul64(a[2], a[3], b[2], b[3]);
    var vs = mul64((a[0] ^ a[2]) >>> 0, (a[1] ^ a[3]) >>> 0, (b[0] ^ b[2]) >>> 0, (b[1] ^ b[3]) >>> 0);
    var t = mul64(v1[0], v1[1], 0, 0x20000000); // v1 * Block64::TAU
    return [(v0[0] ^ t[0]) >>> 0, (v0[1] ^ t[1]) >>> 0, (v0[0] ^ vs[0]) >>> 0, (v0[1] ^ vs[1]) >>> 0];
  }
  function add128(a, b) {
    return [(a[0] ^ b[0]) >>> 0, (a[1] ^ b[1]) >>> 0, (a[2] ^ b[2]) >>> 0, (a[3] ^ b[3]) >>> 0];
  }
  function small(n) { return [n >>> 0, 0, 0, 0]; }

  // Block128 <-> bytes: u128::to_le_bytes / from_le_bytes (block128.rs:139-156)
  function fromLE(bytes, off) {
    off = off || 0;
    var w = [0, 0, 0, 0];
    for (var i = 0; i < 4; i++) {
      var o = off + 4 * i;
      w[i] = (bytes[o] | (bytes[o + 1] << 8) | (bytes[o + 2] << 16) | (bytes[o + 3] << 24)) >>> 0;
    }
    return w;
  }
  function toLE(w, out, off) {
    for (var i = 0; i < 4; i++) {
      var o = off + 4 * i;
      out[o] = w[i] & 255; out[o + 1] = (w[i] >>> 8) & 255;
      out[o + 2] = (w[i] >>> 16) & 255; out[o + 3] = (w[i] >>> 24) & 255;
    }
  }

  // -------------------------------------------------------------------------
  // Poseidon2b permutation, t=4, x^7, 8 full + 58 partial (permutation.rs:17-21)
  // -------------------------------------------------------------------------
  var F_ROUNDS = 8, P_ROUNDS = 58, N_ROUNDS = 66;
  // permutation.rs:185-190
  var RC = [
    [0x0,0x1,0x0,0x3,0x7,0x7,0x6,0x6,0x2,0x1,0x7,0x2,0x2,0x3,0x3,0x2,0x6,0x5,0x7,0x5,0x0,0x2,0x2,0x3,0x1,0x5,0x2,0x6,0x1,0x4,0x1,0x0,0x3,0x7,0x2,0x0,0x1,0x2,0x4,0x1,0x0,0x0,0x2,0x5,0x7,0x2,0x0,0x4,0x1,0x5,0x5,0x1,0x2,0x7,0x3,0x1,0x0,0x1,0x3,0x7,0x1,0x6,0x1,0x6,0x6,0x2],
    [0x3,0x3,0x0,0x6,0x7,0x1,0x1,0x2,0x7,0x3,0x7,0x5,0x7,0x1,0x7,0x3,0x6,0x1,0x7,0x5,0x5,0x5,0x7,0x1,0x6,0x5,0x1,0x2,0x6,0x3,0x5,0x4,0x4,0x6,0x3,0x2,0x3,0x0,0x4,0x1,0x0,0x6,0x1,0x7,0x6,0x7,0x1,0x6,0x4,0x1,0x4,0x0,0x4,0x3,0x4,0x0,0x3,0x0,0x0,0x7,0x3,0x2,0x3,0x5,0x0,0x2],
    [0x6,0x0,0x5,0x3,0x2,0x5,0x6,0x5,0x6,0x7,0x2,0x7,0x6,0x4,0x1,0x0,0x6,0x3,0x2,0x6,0x2,0x1,0x5,0x3,0x1,0x7,0x7,0x6,0x7,0x1,0x1,0x4,0x4,0x4,0x6,0x2,0x5,0x4,0x0,0x3,0x1,0x4,0x1,0x6,0x1,0x6,0x7,0x7,0x6,0x2,0x7,0x3,0x3,0x3,0x0,0x2,0x6,0x4,0x0,0x0,0x0,0x3,0x1,0x4,0x1,0x5],
    [0x7,0x1,0x1,0x5,0x1,0x2,0x2,0x7,0x5,0x0,0x5,0x5,0x1,0x4,0x6,0x5,0x2,0x4,0x0,0x1,0x0,0x4,0x6,0x4,0x3,0x7,0x3,0x2,0x4,0x0,0x1,0x6,0x3,0x3,0x2,0x6,0x3,0x4,0x6,0x3,0x2,0x3,0x5,0x1,0x1,0x2,0x4,0x5,0x5,0x6,0x0,0x5,0x5,0x6,0x4,0x1,0x2,0x1,0x5,0x7,0x1,0x3,0x1,0x2,0x2,0x2]
  ];
  var MDS_FULL = [[0x5,0x7,0x1,0x3],[0x4,0x6,0x1,0x1],[0x1,0x3,0x5,0x7],[0x1,0x1,0x4,0x6]]; // :193-198
  var MDS_PARTIAL = [[0x20,1,1,1],[1,0x2000,1,1],[1,1,0x200,1],[1,1,1,0x800]];          // :201-206

  function applyMds(state, m) { // permutation.rs:286-314 (tower reference), :135-166 (flat)
    var input = state.slice();
    for (var i = 0; i < 4; i++) {
      var out = [0, 0, 0, 0];
      for (var j = 0; j < 4; j++) {
        out = add128(out, m[i][j] === 1 ? input[j] : mul128(small(m[i][j]), input[j]));
      }
      state[i] = out;
    }
  }
  function sbox7(x) { // x^7 = x^4 * x^2 * x (permutation.rs:177-182, 316-321)
    var x2 = mul128(x, x), x4 = mul128(x2, x2);
    return mul128(x4, mul128(x2, x));
  }
  /** In-place Poseidon2b on [Block128;4] (permutation.rs:50-90 / 267-284). */
  function permute(state) {
    applyMds(state, MDS_FULL);
    for (var r = 0; r < N_ROUNDS; r++) {
      if (r < F_ROUNDS / 2 || r >= F_ROUNDS / 2 + P_ROUNDS) {
        for (var i = 0; i < 4; i++) state[i] = sbox7(add128(state[i], small(RC[i][r])));
        applyMds(state, MDS_FULL);
      } else {
        state[0] = sbox7(add128(state[0], small(RC[0][r])));
        applyMds(state, MDS_PARTIAL);
      }
    }
    return state;
  }

  // -------------------------------------------------------------------------
  // Domain tags (domain.rs:15-40, 54-56)
  // -------------------------------------------------------------------------
  function asciiBytes(s) { var b = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b; }
  /** capacity_iv(tag): label = u64::from_be_bytes(tag); [label<<64, label]. */
  function capacityIv(tag) {
    if (tag.length !== 8) throw new Error('domain tag must be 8 ASCII bytes');
    var b = asciiBytes(tag);
    var hi32 = ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0;
    var lo32 = ((b[4] << 24) | (b[5] << 16) | (b[6] << 8) | b[7]) >>> 0;
    return [[0, 0, lo32, hi32], [lo32, hi32, 0, 0]];
  }
  var TAGS = {
    LEAF: 'LEAF____', COMMIT: 'COMMIT__', ADDRFIX: 'ADDRFIX_', COMPRESS: 'COMPRESS',
    BYTEHASH: 'BYTEHASH', EXSTSLT: 'EXSTSLT_', EXSTNOD: 'EXSTNOD_', TX8X2: 'TX8X2___'
  };

  // -------------------------------------------------------------------------
  // Sponge t=4, rate=2, cap=2 (compression.rs:20-217)
  // -------------------------------------------------------------------------
  function Sponge(iv) { // with_iv: compression.rs:70-77 ; new(): zero IV
    iv = iv || [[0, 0, 0, 0], [0, 0, 0, 0]];
    this.state = [[0, 0, 0, 0], [0, 0, 0, 0], iv[0].slice(), iv[1].slice()];
    this.buffer = new Uint8Array(32);
    this.filled = 0;
  }
  Sponge.prototype._permuteBuffer = function () { // :198-209
    this.state[0] = add128(this.state[0], fromLE(this.buffer, 0));
    this.state[1] = add128(this.state[1], fromLE(this.buffer, 16));
    permute(this.state);
  };
  Sponge.prototype.update = function (data) { // :80-104
    var pos = 0, n = data.length;
    if (this.filled !== 0) {
      var take = Math.min(n, 32 - this.filled);
      this.buffer.set(data.subarray(0, take), this.filled);
      pos = take; this.filled += take;
      if (this.filled === 32) { this._permuteBuffer(); this.filled = 0; }
    }
    while (n - pos >= 32) { this.buffer.set(data.subarray(pos, pos + 32)); this._permuteBuffer(); pos += 32; }
    if (pos < n) { this.buffer.set(data.subarray(pos, n)); this.filled = n - pos; }
  };
  Sponge.prototype.absorb = function (elem) { var b = new Uint8Array(16); toLE(elem, b, 0); this.update(b); }; // :107-112
  Sponge.prototype.absorbPair = function (a, b) { // :115-123
    var buf = new Uint8Array(32); toLE(a, buf, 0); toLE(b, buf, 16); this.update(buf);
  };
  Sponge.prototype._squeeze32 = function () { // :211-216
    var out = new Uint8Array(32); toLE(this.state[0], out, 0); toLE(this.state[1], out, 16); return out;
  };
  Sponge.prototype.finalize = function () { // :126-130, fill_padding :293-298
    for (var i = this.filled; i < 32; i++) this.buffer[i] = 0;
    this.buffer[this.filled] |= 0x80;
    this.buffer[31] |= 0x01;
    this._permuteBuffer();
    return this._squeeze32();
  };
  Sponge.prototype.finalizeNoPad = function () { // :139-145
    if (this.filled !== 0) throw new Error('finalize_no_pad requires a whole number of rate blocks');
    return this._squeeze32();
  };

  /** compress_with_tag (compression.rs:244-261). */
  function compressWithTag(tag, a, b) {
    var iv = capacityIv(tag);
    var st = [fromLE(a, 0), fromLE(a, 16), iv[0], iv[1]];
    permute(st);
    st[0] = add128(st[0], fromLE(b, 0));
    st[1] = add128(st[1], fromLE(b, 16));
    permute(st);
    var out = new Uint8Array(32); toLE(st[0], out, 0); toLE(st[1], out, 16); return out;
  }

  // -------------------------------------------------------------------------
  // Wallet: master -> spend secret(index) -> address
  // -------------------------------------------------------------------------
  // "noid-deri" = 0x6E6F69642D64657269 (keystore.rs:89), as Block128 words
  // 0x6E_6F69642D_64657269 split into little-endian u32 limbs (test re-checks via BigInt)
  var NOID_DERI = [0x64657269, 0x6F69642D, 0x6E, 0];

  /** MasterSecret::derive_spend_secret (keystore.rs:76-94). */
  function deriveSpendSecret(master, index) {
    index = index === undefined ? 0 : index;
    if (!(index >= 0 && index <= 0xffffffff && Math.floor(index) === index)) throw new Error('index must be a u32');
    var s = new Sponge([[0, 0, 0, 0], [0, 0, 0, 0]]);
    s.absorb(fromLE(master, 0));
    s.absorb(fromLE(master, 16));
    s.absorb([index >>> 0, 0, 0, 0]); // Block128::from(index as u128)
    s.absorb(NOID_DERI);
    return s.finalize();
  }
  /** primitives.rs derive_address (:301-306) with prover_fields (:228-240). */
  function deriveAddress(spendSecret) {
    var s = new Sponge(capacityIv(TAGS.ADDRFIX));
    s.absorbPair(fromLE(spendSecret, 0), fromLE(spendSecret, 16));
    return s.finalizeNoPad();
  }

  // -------------------------------------------------------------------------
  // Bech32 / Bech32m (BIP-173 / BIP-350); HRP "k" (primitives.rs:84, 113-146)
  // -------------------------------------------------------------------------
  var CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
  var BECH32M_CONST = 0x2bc830a3;
  function polymod(values) {
    var GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
    var chk = 1;
    for (var i = 0; i < values.length; i++) {
      var top = chk >>> 25;
      chk = (((chk & 0x1ffffff) << 5) ^ values[i]) >>> 0;
      for (var j = 0; j < 5; j++) if ((top >>> j) & 1) chk = (chk ^ GEN[j]) >>> 0;
    }
    return chk >>> 0;
  }
  function hrpExpand(hrp) {
    var r = [], i;
    for (i = 0; i < hrp.length; i++) r.push(hrp.charCodeAt(i) >> 5);
    r.push(0);
    for (i = 0; i < hrp.length; i++) r.push(hrp.charCodeAt(i) & 31);
    return r;
  }
  function convertBits(data, from, to, pad) {
    var acc = 0, bits = 0, out = [], maxv = (1 << to) - 1;
    for (var i = 0; i < data.length; i++) {
      acc = (acc << from) | data[i]; bits += from;
      while (bits >= to) { bits -= to; out.push((acc >> bits) & maxv); }
      acc &= (1 << bits) - 1;
    }
    if (pad && bits > 0) out.push((acc << (to - bits)) & maxv);
    return out; // !pad: leftover bits dropped, like bech32 0.11 byte_iter
  }
  function bech32Encode(hrp, data5, constant) {
    var values = hrpExpand(hrp).concat(data5, [0, 0, 0, 0, 0, 0]);
    var pm = (polymod(values) ^ constant) >>> 0;
    var s = hrp + '1';
    for (var i = 0; i < data5.length; i++) s += CHARSET[data5[i]];
    for (var p = 0; p < 6; p++) s += CHARSET[(pm >>> (5 * (5 - p))) & 31];
    return s;
  }
  /** Generic decode; returns {hrp, data5, variant:'bech32'|'bech32m'} or throws. */
  function bech32Decode(str) {
    var hasLower = false, hasUpper = false, i, c;
    for (i = 0; i < str.length; i++) {
      c = str.charCodeAt(i);
      if (c < 33 || c > 126) throw new Error('invalid character');
      if (c >= 97 && c <= 122) hasLower = true;
      if (c >= 65 && c <= 90) hasUpper = true;
    }
    if (hasLower && hasUpper) throw new Error('mixed case');
    str = str.toLowerCase();
    var pos = str.lastIndexOf('1');
    if (pos < 1) throw new Error('missing HRP or separator');
    if (str.length - pos - 1 < 6) throw new Error('checksum too short');
    var hrp = str.slice(0, pos), data = [];
    if (hrp.length > 83) throw new Error('HRP too long');
    for (i = pos + 1; i < str.length; i++) {
      var d = CHARSET.indexOf(str[i]);
      if (d < 0) throw new Error('invalid data character');
      data.push(d);
    }
    var pm = polymod(hrpExpand(hrp).concat(data));
    var variant = pm === BECH32M_CONST ? 'bech32m' : pm === 1 ? 'bech32' : null;
    if (!variant) throw new Error('invalid checksum');
    return { hrp: hrp, data5: data.slice(0, data.length - 6), variant: variant };
  }

  var ADDRESS_HRP = 'k';
  function addressToBech32(addrBytes) { // Address::to_bech32 — bech32::encode::<Bech32m>(hrp, bytes)
    if (addrBytes.length !== 32) throw new Error('address must be 32 bytes');
    return bech32Encode(ADDRESS_HRP, convertBits(addrBytes, 8, 5, true), BECH32M_CONST);
  }
  /** parse_address (primitives.rs:133-146). bech32::decode accepts Bech32m OR
   *  legacy Bech32 checksums (bech32-0.11.1 src/lib.rs:208-221); mirrored. */
  function parseAddress(s) {
    s = String(s).trim();
    var d;
    try { d = bech32Decode(s); } catch (e) { return { valid: false, error: 'invalid address format (' + e.message + ')' }; }
    if (d.hrp.toLowerCase() !== ADDRESS_HRP) return { valid: false, error: "wrong address network: got '" + d.hrp + "', expected 'k'" };
    var bytes = convertBits(d.data5, 5, 8, false);
    if (bytes.length !== 32) return { valid: false, error: 'wrong address length: got ' + bytes.length + ' bytes, expected 32' };
    return { valid: true, hex: toHex(Uint8Array.from(bytes)), variant: d.variant, canonical: d.variant === 'bech32m' };
  }

  // -------------------------------------------------------------------------
  // BLAKE3 (hash / keyed / derive_key), streaming, pure JS
  // -------------------------------------------------------------------------
  var IV = new Uint32Array([0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A, 0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19]);
  var CHUNK_START = 1, CHUNK_END = 2, PARENT = 4, ROOT = 8, KEYED_HASH = 16, DERIVE_KEY_CONTEXT = 32, DERIVE_KEY_MATERIAL = 64;
  var MSG_PERM = [2, 6, 3, 10, 7, 0, 4, 13, 1, 11, 12, 5, 9, 14, 15, 8];
  var SCHED = (function () {
    var s = [], cur = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    for (var r = 0; r < 7; r++) { s.push(cur.slice()); cur = MSG_PERM.map(function (p) { return cur[p]; }); }
    return s;
  })();
  var V = new Uint32Array(16);
  function g(a, b, c, d, x, y) {
    V[a] = (V[a] + V[b] + x) | 0; V[d] ^= V[a]; V[d] = (V[d] >>> 16) | (V[d] << 16);
    V[c] = (V[c] + V[d]) | 0; V[b] ^= V[c]; V[b] = (V[b] >>> 12) | (V[b] << 20);
    V[a] = (V[a] + V[b] + y) | 0; V[d] ^= V[a]; V[d] = (V[d] >>> 8) | (V[d] << 24);
    V[c] = (V[c] + V[d]) | 0; V[b] ^= V[c]; V[b] = (V[b] >>> 7) | (V[b] << 25);
  }
  /** returns 16-word state (first 8 = new CV) */
  function b3compress(cv, m, counter, blockLen, flags) {
    for (var i = 0; i < 8; i++) V[i] = cv[i];
    V[8] = IV[0]; V[9] = IV[1]; V[10] = IV[2]; V[11] = IV[3];
    V[12] = counter >>> 0; V[13] = Math.floor(counter / 4294967296) >>> 0; V[14] = blockLen; V[15] = flags;
    for (var r = 0; r < 7; r++) {
      var s = SCHED[r];
      g(0, 4, 8, 12, m[s[0]], m[s[1]]); g(1, 5, 9, 13, m[s[2]], m[s[3]]);
      g(2, 6, 10, 14, m[s[4]], m[s[5]]); g(3, 7, 11, 15, m[s[6]], m[s[7]]);
      g(0, 5, 10, 15, m[s[8]], m[s[9]]); g(1, 6, 11, 12, m[s[10]], m[s[11]]);
      g(2, 7, 8, 13, m[s[12]], m[s[13]]); g(3, 4, 9, 14, m[s[14]], m[s[15]]);
    }
    var out = new Uint32Array(16);
    for (i = 0; i < 8; i++) { out[i] = V[i] ^ V[i + 8]; out[i + 8] = V[i + 8] ^ cv[i]; }
    return out;
  }
  function wordsLE(bytes, off, len) {
    var m = new Uint32Array(16);
    for (var i = 0; i < len; i++) m[i >> 2] |= bytes[off + i] << (8 * (i & 3));
    return m;
  }
  function Blake3(keyWords, flags) {
    this.key = keyWords; this.flags = flags; this.stack = [];
    this._newChunk(0);
  }
  Blake3.prototype._newChunk = function (counter) {
    this.cv = this.key.slice(0, 8); this.counter = counter;
    this.block = new Uint8Array(64); this.blockLen = 0; this.blocksCompressed = 0;
  };
  Blake3.prototype._chunkLen = function () { return 64 * this.blocksCompressed + this.blockLen; };
  Blake3.prototype._startFlag = function () { return this.blocksCompressed === 0 ? CHUNK_START : 0; };
  Blake3.prototype._chunkOutput = function () {
    return { cv: this.cv, m: wordsLE(this.block, 0, this.blockLen), counter: this.counter, len: this.blockLen,
      flags: this.flags | this._startFlag() | CHUNK_END };
  };
  function outCv(o) { return b3compress(o.cv, o.m, o.counter, o.len, o.flags).subarray(0, 8); }
  Blake3.prototype._parent = function (l, r) {
    var m = new Uint32Array(16); m.set(l, 0); m.set(r, 8);
    return { cv: this.key, m: m, counter: 0, len: 64, flags: this.flags | PARENT };
  };
  Blake3.prototype.update = function (input) {
    var pos = 0, n = input.length;
    while (pos < n) {
      if (this._chunkLen() === 1024) {
        var cv = outCv(this._chunkOutput());
        var total = this.counter + 1;
        while (total % 2 === 0) { cv = outCv(this._parent(this.stack.pop(), cv)); total /= 2; }
        this.stack.push(cv);
        this._newChunk(this.counter + 1);
      }
      if (this.blockLen === 64) {
        this.cv = b3compress(this.cv, wordsLE(this.block, 0, 64), this.counter, 64, this.flags | this._startFlag()).subarray(0, 8);
        this.blocksCompressed++; this.blockLen = 0; this.block.fill(0);
      }
      // fast path: whole blocks straight from input while more data follows
      // (a block may only be compressed once we know it's not the last one)
      while (this.blockLen === 0 && this._chunkLen() < 1024 - 64 && n - pos > 64) {
        this.cv = b3compress(this.cv, wordsLE(input, pos, 64), this.counter, 64, this.flags | this._startFlag()).subarray(0, 8);
        this.blocksCompressed++; pos += 64;
      }
      var take = Math.min(64 - this.blockLen, 1024 - this._chunkLen(), n - pos);
      if (take <= 0) continue;
      this.block.set(input.subarray(pos, pos + take), this.blockLen);
      this.blockLen += take; pos += take;
    }
    return this;
  };
  Blake3.prototype.digest = function (outLen) {
    outLen = outLen || 32;
    var o = this._chunkOutput();
    for (var i = this.stack.length - 1; i >= 0; i--) o = this._parent(this.stack[i], outCv(o));
    var out = new Uint8Array(outLen), blockCounter = 0, p = 0;
    while (p < outLen) {
      var w = b3compress(o.cv, o.m, blockCounter++, o.len, o.flags | ROOT);
      for (var j = 0; j < 64 && p < outLen; j++, p++) out[p] = (w[j >> 2] >>> (8 * (j & 3))) & 255;
    }
    return out;
  };
  function utf8(s) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(s);
    return Uint8Array.from(Buffer.from(s, 'utf8'));
  }
  var blake3 = {
    hash: function (data, outLen) { return new Blake3(IV, 0).update(data).digest(outLen); },
    keyed: function (key32, data, outLen) { return new Blake3(wordsLE(key32, 0, 32).subarray(0, 8), KEYED_HASH).update(data).digest(outLen); },
    deriveKeyHasher: function (context) {
      var ck = new Blake3(IV, DERIVE_KEY_CONTEXT).update(utf8(context)).digest(32);
      return new Blake3(wordsLE(ck, 0, 32).subarray(0, 8), DERIVE_KEY_MATERIAL);
    },
    deriveKey: function (context, material, outLen) { return blake3.deriveKeyHasher(context).update(material).digest(outLen); }
  };

  // -------------------------------------------------------------------------
  // Photo Key (noid_gui/src/secret.rs)
  // -------------------------------------------------------------------------
  var MIN_DIM = 32, MIN_DISTINCT = 64;                                        // secret.rs:14-15
  var IMAGE_SECRET_CONTEXT = 'Kairos Chain master secret from canonical image pixels v1'; // :16
  var KEY_ID_CONTEXT = 'Kairos Chain master secret fingerprint v1';           // :17

  function u32le(v) { return Uint8Array.of(v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255); }
  /** derive_image_secret (secret.rs:141-149): "RGBA8" || w u32le || h u32le || len u64le || rgba. */
  function deriveImageSecret(w, h, rgba, context) {
    var hh = blake3.deriveKeyHasher(context || IMAGE_SECRET_CONTEXT);
    hh.update(asciiBytes('RGBA8')); hh.update(u32le(w)); hh.update(u32le(h));
    var len = rgba.length, lenBytes = new Uint8Array(8);
    for (var i = 0; i < 8; i++) { lenBytes[i] = len % 256; len = Math.floor(len / 256); }
    hh.update(lenBytes); hh.update(rgba);
    return hh.digest(32);
  }
  /** validate_image_secret_source (secret.rs:110-127). */
  function validateImageSource(w, h, rgba) {
    if (w < MIN_DIM || h < MIN_DIM) throw new Error('the image must be at least 32 × 32 pixels');
    var seen = new Set();
    for (var i = 0; i + 3 < rgba.length; i += 4) {
      seen.add(((rgba[i] << 24) | (rgba[i + 1] << 16) | (rgba[i + 2] << 8) | rgba[i + 3]) >>> 0);
      if (seen.size >= MIN_DISTINCT) return;
    }
    throw new Error('the image must contain at least 64 distinct pixel values');
  }
  /** key_id (secret.rs:151-163): first 8 bytes hex, grouped 4·4·4·4 with U+00B7. */
  function keyId(secretBytes) {
    var e = toHex(blake3.deriveKey(KEY_ID_CONTEXT, secretBytes, 32).subarray(0, 8));
    return e.slice(0, 4) + '·' + e.slice(4, 8) + '·' + e.slice(8, 12) + '·' + e.slice(12);
  }

  // -------------------------------------------------------------------------
  // Helpers + public API
  // -------------------------------------------------------------------------
  function toHex(b) { var s = ''; for (var i = 0; i < b.length; i++) s += (b[i] < 16 ? '0' : '') + b[i].toString(16); return s; }
  function fromHex(h) {
    h = String(h).replace(/\s+/g, ''); // import_generated_master_secret strips ASCII whitespace (state.rs:580-585)
    if (!/^[0-9a-fA-F]*$/.test(h) || h.length % 2) throw new Error('invalid hex');
    var b = new Uint8Array(h.length / 2);
    for (var i = 0; i < b.length; i++) b[i] = parseInt(h.substr(2 * i, 2), 16);
    return b;
  }
  function master32(m) {
    var b = typeof m === 'string' ? fromHex(m) : Uint8Array.from(m);
    if (b.length !== 32) throw new Error('Master secret must contain exactly 64 hexadecimal characters.');
    return b;
  }
  function randomBytes(n) {
    var c = typeof globalThis !== 'undefined' && globalThis.crypto;
    if (c && c.getRandomValues) return c.getRandomValues(new Uint8Array(n));
    if (typeof require === 'function') return Uint8Array.from(require('crypto').randomBytes(n));
    throw new Error('no secure RNG available');
  }

  return {
    version: '1.0.0',
    /** RGBA8 pixels (Uint8Array/Uint8ClampedArray, length w*h*4) -> {masterHex, keyId}. */
    fromPixels: function (rgba, w, h) {
      rgba = rgba instanceof Uint8Array ? rgba : new Uint8Array(rgba.buffer || rgba, rgba.byteOffset || 0, rgba.length);
      if (rgba.length !== w * h * 4) throw new Error('pixel buffer length must equal width*height*4');
      validateImageSource(w, h, rgba);
      var secret = deriveImageSecret(w, h, rgba);
      return { masterHex: toHex(secret), keyId: keyId(secret) };
    },
    randomMaster: function () { return toHex(randomBytes(32)); },
    keyId: function (masterHex) { return keyId(master32(masterHex)); },
    spendSecret: function (masterHex, index) { return toHex(deriveSpendSecret(master32(masterHex), index || 0)); },
    addressBytes: function (masterHex, index) { return toHex(deriveAddress(deriveSpendSecret(master32(masterHex), index || 0))); },
    address: function (masterHex, index) { return addressToBech32(deriveAddress(deriveSpendSecret(master32(masterHex), index || 0))); },
    addressFromSpendSecret: function (spendHex) { return addressToBech32(deriveAddress(master32(spendHex))); },
    validateAddress: parseAddress,
    encodeAddress: function (hex32) { return addressToBech32(master32(hex32)); },
    // low-level, exported for tests / tooling
    _internal: {
      mul8: mul8, mul16: mul16, mul32: mul32, mul64: mul64, mul128: mul128, add128: add128,
      permute: permute, Sponge: Sponge, capacityIv: capacityIv, compressWithTag: compressWithTag,
      deriveSpendSecret: deriveSpendSecret, deriveAddress: deriveAddress, deriveImageSecret: deriveImageSecret,
      validateImageSource: validateImageSource, bech32Encode: bech32Encode, bech32Decode: bech32Decode,
      convertBits: convertBits, BECH32M_CONST: BECH32M_CONST, blake3: blake3, fromLE: fromLE, toLE: toLE,
      toHex: toHex, fromHex: fromHex, TAGS: TAGS, NOID_DERI: NOID_DERI
    }
  };
});
