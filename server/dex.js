// Kairos native assets on the web testnet: fixed-supply tokens with redeemable KAIROS backing, a launchpad bonding
// curve that graduates into a native liquidity pool (same asset id), pool swaps, liquidity and redemption.
// Pure state transitions over D (asset state) given the KAIROS an op brings in; the caller settles the KAIROS side.
// All amounts are BigInt base units: 1 KAIROS = 1e6 μKAIROS, 1 whole token = 1e6 base units.
'use strict';
const ONE = 1_000_000n, RAISE = BigInt(process.env.LAUNCH_RAISE_KAIROS || 200) * ONE, VB = RAISE / 4n, CREATE_FEE = 1n * ONE, MIN_BACKING = 10n, POOL_FEE_BPS = 30n;
const fresh = () => ({ assets: {}, bal: {}, trades: {} });
const big = (v) => { const b = BigInt(v); if (b < 0n) throw new Error('negative amount'); return b; };
const get = (D, id, o) => BigInt((D.bal[id] || {})[o] || '0');
const put = (D, id, o, v) => { D.bal[id] = D.bal[id] || {}; if (v === 0n) delete D.bal[id][o]; else D.bal[id][o] = v.toString(); };
const add = (D, id, o, v) => put(D, id, o, get(D, id, o) + v);
const ceilDiv = (a, b) => (a + b - 1n) / b;
// curve: virtual constant product x·y = k with x = VB + raised, y = 1.25·Tc − sold. Selling all Tc raises exactly RAISE.
const curveXY = (a) => { const Tc = BigInt(a.curveTokens), x = VB + BigInt(a.raised), y = (Tc * 5n) / 4n - BigInt(a.sold); return { x, y, Tc }; };
const priceOf = (a) => { if (a.pool) return Number(BigInt(a.pool.kai) * ONE / BigInt(a.pool.tok || 1)) / 1e6; if (a.mode === 'launch') { const { x, y } = curveXY(a); return Number(x * ONE / y) / 1e6; } return null; };
function trade(D, a, h, ts, side, kai, tok) { (D.trades[a.id] = D.trades[a.id] || []).push({ h, ts, side, kai: kai.toString(), tok: tok.toString(), price: Number(kai * ONE / (tok || 1n)) / 1e6 }); if (D.trades[a.id].length > 5000) D.trades[a.id].shift(); }
function graduate(a) { a.graduated = true; a.pool = { kai: a.raised, tok: a.poolTokens, lp: a.raised, lps: {} }; a.gradAt = a.lastH; } // the initial LP shares are locked forever: nobody holds them
// op(D, op, ctx) → { spent: μKAIROS consumed, received: μKAIROS paid out, burned: μKAIROS, note } ; ctx = { owner, kaiIn (available), h, ts, idFor }
function apply(D, op, ctx) {
  const o = ctx.owner;
  if (op.type === 'create') {
    const name = String(op.name || '').trim().slice(0, 32), ticker = String(op.ticker || '').trim().toUpperCase();
    if (name.length < 2) throw new Error('name needs at least 2 characters'); if (!/^[A-Z0-9]{2,8}$/.test(ticker)) throw new Error('ticker: 2 to 8 letters or digits');
    if (Object.values(D.assets).some((x) => x.ticker === ticker)) throw new Error('ticker already taken');
    const supply = big(op.supply); if (supply < 1000n || supply > 1_000_000_000n) throw new Error('supply: 1,000 to 1,000,000,000 whole tokens');
    const backing = big(op.backing ?? MIN_BACKING); if (backing < MIN_BACKING) throw new Error('backing: at least 0.00001 KAIROS per token');
    const reserve = supply * backing, cost = reserve + CREATE_FEE; if (ctx.kaiIn < cost) throw new Error(`needs ${Number(cost) / 1e6} KAIROS (backing reserve + 1 KAIROS fee)`);
    const mode = op.mode === 'direct' ? 'direct' : 'launch', id = ctx.idFor(ticker), S = supply * ONE;
    const a = { id, name, ticker, desc: String(op.desc || '').slice(0, 140), color: /^#[0-9a-f]{6}$/i.test(op.color || '') ? op.color : '#ffc35a', creator: o, created: ctx.h, ts: ctx.ts, mode, supply: S.toString(), backing: backing.toString(), reserve: reserve.toString(), burned: '0', raised: '0', sold: '0', graduated: false, lastH: ctx.h };
    if (mode === 'launch') { a.curveTokens = (S * 4n / 5n).toString(); a.poolTokens = (S - S * 4n / 5n).toString(); } else add(D, id, o, S);
    D.assets[id] = a; return { spent: cost, received: 0n, burned: CREATE_FEE, note: `created ${ticker} (${mode})`, asset: id };
  }
  const a = D.assets[op.asset]; if (!a) throw new Error('unknown asset'); a.lastH = ctx.h;
  if (op.type === 'buy') {
    let kai = big(op.kai); if (kai <= 0n) throw new Error('amount must be positive'); if (kai > ctx.kaiIn) throw new Error('not enough KAIROS'); const min = big(op.min || 0);
    let out, used;
    if (a.mode === 'launch' && !a.graduated) { const { x, y, Tc } = curveXY(a), left = RAISE - BigInt(a.raised); used = kai > left ? left : kai; const ny = ceilDiv(x * y, x + used); out = y - ny; const sellable = Tc - BigInt(a.sold); if (out > sellable) out = sellable;
      a.raised = (BigInt(a.raised) + used).toString(); a.sold = (BigInt(a.sold) + out).toString(); }
    else if (a.pool) { const P = a.pool, X = BigInt(P.kai), Y = BigInt(P.tok), inF = kai * (10000n - POOL_FEE_BPS) / 10000n; out = Y - ceilDiv(X * Y, X + inF); used = kai; P.kai = (X + kai).toString(); P.tok = (Y - out).toString(); }
    else throw new Error('this token has no market yet; add liquidity first');
    if (out <= 0n) throw new Error('amount too small');
    if (out < min) throw new Error(`price moved: would receive ${Number(out) / 1e6}, limit ${Number(min) / 1e6}`);
    add(D, a.id, o, out); trade(D, a, ctx.h, ctx.ts, 'buy', used, out);
    if (a.mode === 'launch' && !a.graduated && BigInt(a.raised) >= RAISE) graduate(a);
    return { spent: used, received: 0n, burned: 0n, note: `bought ${Number(out) / 1e6} ${a.ticker}`, out: out.toString(), refund: (kai - used).toString() };
  }
  if (op.type === 'sell') {
    const tok = big(op.tok); if (tok <= 0n) throw new Error('amount must be positive'); if (tok > get(D, a.id, o)) throw new Error(`not enough ${a.ticker}`); const min = big(op.min || 0); let out;
    if (a.mode === 'launch' && !a.graduated) { const { x, y } = curveXY(a); out = x - ceilDiv(x * y, y + tok); if (out > BigInt(a.raised)) out = BigInt(a.raised); a.raised = (BigInt(a.raised) - out).toString(); a.sold = (BigInt(a.sold) - tok).toString(); }
    else if (a.pool) { const P = a.pool, X = BigInt(P.kai), Y = BigInt(P.tok), inF = tok * (10000n - POOL_FEE_BPS) / 10000n; out = X - ceilDiv(X * Y, Y + inF); P.kai = (X - out).toString(); P.tok = (Y + tok).toString(); }
    else throw new Error('this token has no market yet');
    if (out <= 0n) throw new Error('amount too small'); if (out < min) throw new Error(`price moved: would receive ${Number(out) / 1e6} KAIROS, limit ${Number(min) / 1e6}`);
    add(D, a.id, o, -tok); trade(D, a, ctx.h, ctx.ts, 'sell', out, tok); return { spent: 0n, received: out, burned: 0n, note: `sold ${Number(tok) / 1e6} ${a.ticker}` };
  }
  if (op.type === 'redeem') {
    const tok = big(op.tok); if (tok <= 0n || tok > get(D, a.id, o)) throw new Error(`not enough ${a.ticker}`); const pay = tok * BigInt(a.backing) / ONE;
    add(D, a.id, o, -tok); a.burned = (BigInt(a.burned) + tok).toString(); a.reserve = (BigInt(a.reserve) - pay).toString();
    return { spent: 0n, received: pay, burned: 0n, note: `burned ${Number(tok) / 1e6} ${a.ticker} for ${Number(pay) / 1e6} KAIROS backing` };
  }
  if (op.type === 'addLiquidity') {
    const kai = big(op.kai), tok = big(op.tok); if (kai <= 0n || tok <= 0n) throw new Error('both amounts must be positive'); if (kai > ctx.kaiIn) throw new Error('not enough KAIROS'); if (tok > get(D, a.id, o)) throw new Error(`not enough ${a.ticker}`);
    if (a.mode === 'launch' && !a.graduated) throw new Error('the pool opens when the launch graduates');
    let P = a.pool, lp, uk = kai, ut = tok;
    if (!P) { P = a.pool = { kai: '0', tok: '0', lp: '0', lps: {} }; a.graduated = true; lp = kai; }
    else { const X = BigInt(P.kai), Y = BigInt(P.tok), L = BigInt(P.lp); ut = kai * Y / X; if (ut > tok) { ut = tok; uk = tok * X / Y; } lp = uk * L / X; }
    P.kai = (BigInt(P.kai) + uk).toString(); P.tok = (BigInt(P.tok) + ut).toString(); P.lp = (BigInt(P.lp) + lp).toString(); P.lps[o] = (BigInt(P.lps[o] || '0') + lp).toString(); add(D, a.id, o, -ut);
    return { spent: uk, received: 0n, burned: 0n, note: `added ${Number(uk) / 1e6} KAIROS + ${Number(ut) / 1e6} ${a.ticker} liquidity` };
  }
  if (op.type === 'removeLiquidity') {
    const P = a.pool; if (!P) throw new Error('no pool'); const mine = BigInt(P.lps[o] || '0'), lp = op.lp ? big(op.lp) : mine; if (lp <= 0n || lp > mine) throw new Error('no liquidity to remove');
    const L = BigInt(P.lp), k = BigInt(P.kai) * lp / L, t = BigInt(P.tok) * lp / L; P.kai = (BigInt(P.kai) - k).toString(); P.tok = (BigInt(P.tok) - t).toString(); P.lp = (L - lp).toString();
    if (lp === mine) delete P.lps[o]; else P.lps[o] = (mine - lp).toString(); add(D, a.id, o, t);
    return { spent: 0n, received: k, burned: 0n, note: `removed liquidity: ${Number(k) / 1e6} KAIROS + ${Number(t) / 1e6} ${a.ticker}` };
  }
  throw new Error('unknown operation');
}
// move every token balance and LP share from one owner to another (the web-testnet one-time-address model)
function migrate(D, from, to) { for (const id of Object.keys(D.bal)) { const v = get(D, id, from); if (v) { put(D, id, from, 0n); add(D, id, to, v); } }
  for (const a of Object.values(D.assets)) if (a.pool && a.pool.lps[from]) { a.pool.lps[to] = (BigInt(a.pool.lps[to] || '0') + BigInt(a.pool.lps[from])).toString(); delete a.pool.lps[from]; } }
function view(D, a) { const p = priceOf(a), raised = BigInt(a.raised || '0');
  return { id: a.id, name: a.name, ticker: a.ticker, desc: a.desc, color: a.color, mode: a.mode, created: a.created, ts: a.ts, supply: a.supply, backing: a.backing, reserve: a.reserve, burned: a.burned, graduated: a.graduated, raised: a.raised, raiseTarget: RAISE.toString(),
    progress: a.mode === 'launch' ? Number(raised * 10000n / RAISE) / 100 : null, price: p, curveTokens: a.curveTokens || null, sold: a.sold || '0', vb: VB.toString(), pool: a.pool ? { kai: a.pool.kai, tok: a.pool.tok, lp: a.pool.lp } : null, holders: Object.keys(D.bal[a.id] || {}).length, volume: (D.trades[a.id] || []).reduce((s, t) => s + Number(t.kai), 0) / 1e6, trades: (D.trades[a.id] || []).length }; }
module.exports = { fresh, apply, migrate, view, get, RAISE, CREATE_FEE, MIN_BACKING, ONE };
