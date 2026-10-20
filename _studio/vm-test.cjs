// Assertions for client/kairos-vm.js. Vectors ported from
// noid_tx/tests/object_applications.rs (OA:<line>) and
// noid_tx/src/experimental_object/integer_program.rs tests (IP:<line>).
const path = require('path');
const VM = require(path.join(__dirname, '..', 'client', 'kairos-vm.js'));
let pass = 0, failN = 0;
function t(name, cond, info) {
  if (cond) { pass++; } else { failN++; console.log('FAIL', name, info !== undefined ? JSON.stringify(info) : ''); }
}
const MAX = 18446744073709551615n;
const K = (op, dest, l, r, imm, pred) => ({ opcode: op, destination: dest, left: l, right: r, immediate: String(imm), predicate: pred || { source: 'always', inverted: false } });
const noPolicy = { claim_authority: 'a', recovery_authority: 'a', claim_recipient: 'a', recovery_recipient: 'a', deadline: 0, max_fee: String(MAX), min_retained: 0, max_payout: String(MAX), modes: 31 };

// Pure-VM harness: Context::default() equivalent = recovery branch, closing call
// would bypass reserve; use a continuing call after deadline with modes=31.
function core(program, s0, s1, extra) {
  const call = Object.assign({ height: 0, fee: 0, terminal: false, input: { amount: 1, slot: 1, creation_id: 0 }, retained_slot: 2, enforcePositiveOutputs: false }, extra || {});
  return VM.run(program, noPolicy, { state0: String(s0), state1: String(s1) }, call);
}
function single(op, left, right) { return core([K(op, 'state0', 'state0', 'immediate', right)], left, 37); }
const st = (r) => r.ok ? [r.newState.state0, r.newState.state1] : r.error.kind + '@' + r.error.step;
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ---- IP:470-504 arithmetic_is_integer_and_fails_closed_at_u64_boundaries
t('add 1+1', eq(st(single('add', 1, 1)), ['2', '37']));
t('add max-1+1', eq(st(single('add', MAX - 1n, 1)), [String(MAX), '37']));
t('add overflow', st(single('add', MAX, 1)) === 'Overflow@0');
t('sub underflow', st(single('subtract', 0, 1)) === 'Underflow@0');
t('sub max-max', eq(st(single('subtract', MAX, MAX)), ['0', '37']));
t('min', eq(st(single('min', MAX, 1)), ['1', '37']));
t('max', eq(st(single('max', 1, MAX)), [String(MAX), '37']));
t('less_than', eq(st(single('less_than', 1, 2)), ['1', '37']));
t('equal', eq(st(single('equal', 2, 2)), ['1', '37']));
t('assert_equal fails', st(single('assert_equal', 1, 2)) === 'Assertion@0');
t('assert_le fails', st(single('assert_less_or_equal', 2, 1)) === 'Assertion@0');

// ---- IP:506-555 guarded arithmetic / non-boolean predicate
{
  const prog = [K('add', 'state0', 'state0', 'one', 0, { source: 'before_deadline', inverted: false })];
  t('guard inactive after deadline', eq(st(core(prog, MAX, 0)), [String(MAX), '0']));
  const pol = Object.assign({}, noPolicy, { deadline: 10 });
  const r = VM.run(prog, pol, { state0: String(MAX), state1: '0' }, { height: 0, fee: 0, input: { amount: 1 }, enforcePositiveOutputs: false });
  t('guard active overflows', r.error && r.error.kind === 'Overflow' && r.error.step === 0, r.error);
  const p2 = [K('move', 'scratch0', 'immediate', 'zero', 2), K('move', 'state0', 'one', 'zero', 0, { source: 'scratch0', inverted: false })];
  t('non-boolean predicate', st(core(p2, MAX, 0)) === 'NonBooleanPredicate@1');
}
// ---- IP:557-607 context sources + scratch reset
{
  const prog = [K('move', 'state0', 'height', 'zero', 0), K('move', 'state1', 'payout_owner3', 'zero', 0)];
  // owner bytes such that LE words = [12,23,34,45]
  const words = [12n, 23n, 34n, 45n];
  let hex = '';
  for (const w of words) for (let i = 0; i < 8; i++) hex += ((w >> BigInt(8 * i)) & 255n).toString(16).padStart(2, '0');
  const r = core(prog, 1, 2, { height: 91, input: { amount: 2 }, payout: { amount: 1, owner: hex, slot: 3 } });
  t('height + payout_owner3', eq(st(r), ['91', '45']), st(r));
  t('ownerWords LE', eq(VM.ownerWords(hex), ['12', '23', '34', '45']));
  const p2 = [K('move', 'state0', 'scratch0', 'zero', 0), K('move', 'scratch0', 'immediate', 'zero', 17)];
  const first = core(p2, 1, 2);
  t('scratch starts zero', first.newState.state0 === '0');
  t('scratch reset each call', core(p2, first.newState.state0, first.newState.state1).newState.state0 === '0');
}
// ---- IP:416-455 descriptor roundtrip / reserved encodings
{
  let ok = true;
  for (const op of VM.OPCODES) for (const src of VM.OPERANDS) for (const pr of VM.PREDICATES) {
    const ins = K(op, 'state1', src, 'immediate', MAX, { source: pr, inverted: true });
    const enc = VM.encodeInstruction(ins);
    const d = VM.decodeInstruction(enc.descriptor, enc.immediate); if (!d || d.opcode !== op || d.left !== src || d.right !== 'immediate' || d.destination !== 'state1' || d.predicate.source !== pr || !d.predicate.inverted || d.immediate !== String(MAX)) ok = false;
  }
  t('descriptor roundtrip', ok);
  for (const w of [10n, 15n, 24n << 6n, 31n << 11n, 6n << 16n, 7n << 16n, 1n << 20n, (1n << 128n) - 1n])
    t('reserved descriptor ' + w, VM.decodeInstruction(w, 0) === null);
  t('immediate > u64', VM.decodeInstruction(0, 1n << 64n) === null);
}

// ---------------------------------------------------------- application layer
function input() { return { slot: 1, amount: 10000, creation_id: 3 }; }  // OA:9-15
function inst(id, p) { return VM.template(id).build(p); }
function payment(o, coin, height, fee, amount, owner) {           // OA:17-36
  return VM.run(o.program, o.policy, o.state, { height, fee, terminal: false, input: coin, retained_slot: coin.slot + 3,
    payout: { amount, owner: owner === undefined ? o.policy.claim_recipient : owner, slot: coin.slot + 4 } });
}
function call(o, coin, height, fee, terminal) {
  return VM.run(o.program, o.policy, o.state, { height, fee, terminal, input: coin, retained_slot: coin.slot + 3 });
}
function succ(o, r, coin) {                                       // OA:38-50
  if (!r.ok) throw new Error('expected ok: ' + JSON.stringify(r.error));
  return [Object.assign({}, o, { state: r.newState }), { slot: coin.slot + 3, amount: Number(r.retained), creation_id: coin.creation_id + 2 }];
}
const S = (o) => [o.state.state0, o.state.state1].map(Number);

// OA:64-101 period budget
{
  let o = inst('period_budget_wallet', { spending_key: 'spender', recovery_key: 'recovery', payout_recipient: null }), c = input(), r;
  t('budget before start fails', !payment(o, c, 99, 5, 55).ok);
  r = payment(o, c, 100, 5, 55); [o, c] = succ(o, r, c); t('budget [40,110]', eq(S(o), [40, 110]), S(o));
  t('budget over remaining fails', !payment(o, c, 109, 0, 41).ok);
  r = payment(o, c, 109, 10, 30); [o, c] = succ(o, r, c); t('budget [0,110]', eq(S(o), [0, 110]));
  t('fee-only call consumes budget', !call(o, c, 109, 1, false).ok);
  r = payment(o, c, 110, 10, 90); [o, c] = succ(o, r, c); t('budget reset [0,120]', eq(S(o), [0, 120]));
  t('budget exhausted', !payment(o, c, 110, 0, 1).ok);
  r = payment(o, c, 135, 10, 90); [o, c] = succ(o, r, c); t('budget [0,145]', eq(S(o), [0, 145]));
  t('budget exhausted 144', !payment(o, c, 144, 0, 1).ok);
  t('no close before recover', !call(o, c, 149, 0, true).ok);
  r = call(o, c, 150, 10, true);
  t('recovery close', r.ok && r.payout.owner === 'recovery' && r.authority === 'recovery', r);
  t('no payment after recover', !payment(o, c, 150, 0, 1).ok);
}
// OA:103-144 recurring
{
  let o = inst('recurring_payment', { payer: 'payer', payee: 'payee' }), c = input(), r;
  t('recurring early fails', !payment(o, c, 99, 5, 50).ok);
  for (const a of [0, 49, 51]) t('recurring wrong amount ' + a, !payment(o, c, 100, 5, a).ok);
  t('recurring no-payout call fails', !call(o, c, 100, 5, false).ok);
  r = payment(o, c, 101, 5, 50); t('recurring authority payee', r.authority === 'payee');
  [o, c] = succ(o, r, c); t('recurring [1,111]', eq(S(o), [1, 111]));
  for (const h of [101, 110]) t('recurring not due ' + h, !payment(o, c, h, 5, 50).ok);
  r = payment(o, c, 160, 5, 50); [o, c] = succ(o, r, c); t('recurring [2,170]', eq(S(o), [2, 170]));
  t('recurring 169 fails', !payment(o, c, 169, 5, 50).ok);
  r = payment(o, Object.assign({}, c, { amount: 59 }), 170, 5, 50);
  t('recurring ReserveLimit', r.error && r.error.code === 'ReserveLimit', r.error);
  r = payment(o, c, 170, 5, 50); [o, c] = succ(o, r, c);
  t('recurring after deadline payment fails', !payment(o, c, 180, 5, 50).ok);
  r = call(o, c, 180, 5, true); t('recurring payer close', r.ok && r.payout.owner === 'payer' && r.authority === 'payer');
}
// OA:146-178 vesting
{
  let o = inst('tranche_vesting', { beneficiary: 'ben', mature_at: 150 }), c = input(), r;
  t('vest early fails', !payment(o, c, 99, 5, 50).ok);
  for (let n = 1; n <= 3; n++) { r = payment(o, c, 129, 5, 50); [o, c] = succ(o, r, c); t('vest ' + n, eq(S(o), [n * 50, 100 + n * 10])); }
  t('vest 4th at 129 fails', !payment(o, c, 129, 5, 50).ok);
  for (let n = 4; n <= 5; n++) { r = payment(o, c, 149, 5, 50); [o, c] = succ(o, r, c); t('vest ' + n, eq(S(o), [n * 50, 100 + n * 10])); }
  t('vest 6th at 149 fails', !payment(o, c, 149, 5, 50).ok);
  t('vest close before maturity fails', !call(o, c, 149, 5, true).ok);
  r = call(o, c, 150, 5, true);
  t('vest close amount', r.ok && r.payout.owner === 'ben' && r.payout.amount === String(10000 - 5 * 55 - 5), r.payout);
}
// OA:180-238 schedule validation + recovery skips counter overflow
{
  const base = { spending_key: 'o', recovery_key: 'o', payout_recipient: null };
  for (const [ch, e] of [[{ period_blocks: '0' }, 'EmptyPeriod'], [{ budget: '0' }, 'EmptyAmount'], [{ recover_at: '100' }, 'DeadlineBeforeStart'],
    [{ recover_at: String(MAX) }, 'HeightOverflow'], [{ max_fee: '101' }, 'FeeExceedsBudget']]) {
    let got; try { inst('period_budget_wallet', Object.assign({}, base, ch)); got = 'ok'; } catch (x) { got = x.message; }
    t('schedule ' + e, got === e, got);
  }
  const o = inst('recurring_payment', { payer: 'o', payee: 'o', recover_at: 180 });
  o.state = { state0: String(MAX), state1: '100' };
  const r = payment(o, input(), 100, 5, 50);
  t('counter overflow rejects claim', !r.ok && r.error.kind === 'Overflow');
  t('recovery close skips overflow', call(o, input(), 180, 5, true).ok);
}
// OA:240-266 refundable
{
  const o = inst('refundable_payment', { payer: 'payer', payee: 'payee', expiry_height: 50, max_fee: 100 });
  t('refund continue Policy', call(o, input(), 49, 100, false).error.code === 'Policy');
  t('refund FeeLimit', call(o, input(), 49, 101, true).error.code === 'FeeLimit');
  for (const [h, who] of [[49, 'payee'], [50, 'payer'], [51, 'payer']]) {
    const r = call(o, input(), h, 100, true);
    t('refund close ' + h, r.ok && r.payout.owner === who && r.payout.amount === '9900' && r.authority === who, r);
  }
  t('refund signer mismatch', call(o, Object.assign(input()), 50, 100, true).ok &&
    !VM.run(o.program, o.policy, o.state, { height: 50, fee: 100, terminal: true, input: input(), signer: 'payee' }).ok);
}
// OA:268-286 vault
{
  const o = inst('timelocked_vault', { owner: 'owner', unlock_height: 50, max_fee: 100 });
  for (const h of [0, 1, 49]) for (const term of [false, true]) t('vault locked ' + h + term, call(o, input(), h, 0, term).error.code === 'Policy');
  const r = call(o, input(), 50, 100, true);
  t('vault unlocked', r.ok && r.payout.owner === 'owner' && r.payout.amount === '9900');
}
// OA:288-365 allowance
{
  const o = inst('allowance_wallet', { spending_key: 'spender', recovery_key: 'recovery', payout_recipient: 'payee', recover_at: 50, max_fee: 100, max_payout: 500, min_retained: 9400 });
  const pay = (coin, h, fee, amount, owner) => VM.run(o.program, o.policy, o.state, { height: h, fee, input: coin, retained_slot: 2, payout: { amount, owner: owner || 'payee', slot: 3 } });
  let r = pay(input(), 49, 100, 500);
  t('allowance pays', r.ok && r.authority === 'spender' && r.retained === '9400', r);
  t('spender cannot close', !call(o, input(), 49, 100, true).ok);
  t('no payment at recover', !pay(input(), 50, 100, 500).ok);
  r = call(o, input(), 50, 100, true); t('recovery closes', r.ok && r.payout.owner === 'recovery' && r.authority === 'recovery');
  t('payout 501 rejected (reserve checked first, OBJ:190)', pay(input(), 49, 100, 501).error.code === 'ReserveLimit');
  t('payout cap', pay(Object.assign(input(), { amount: 20000 }), 49, 100, 501).error.code === 'PayoutLimit');
  t('recipient fixed', pay(input(), 49, 100, 500, 'mallory').error.code === 'Recipient');
  t('reserve', pay(Object.assign(input(), { amount: 9999 }), 49, 100, 500).error.code === 'ReserveLimit');
  t('fee cap', pay(input(), 49, 101, 500).error.code === 'FeeLimit');
  t('reserve on successor', pay({ slot: 2, amount: 9400, creation_id: 4 }, 49, 0, 500).error.code === 'ReserveLimit');
  const free = inst('allowance_wallet', { payout_recipient: null, recover_at: 50, max_fee: 100, max_payout: 500, min_retained: 9400 });
  t('any recipient mode', free.policy.modes & 16);
  const fp = (a) => VM.run(free.program, free.policy, free.state, { height: 49, fee: 100, input: input(), retained_slot: 2, payout: { amount: a, owner: 'anyone', slot: 3 } });
  t('any recipient ok', fp(500).ok); t('any recipient still capped', !fp(501).ok);
}
// ---- misc
t('balance', call(inst('timelocked_vault', {}), { amount: 5, slot: 1 }, 60, 6, true).error.code === 'Balance');
t('close with payout = Shape', VM.run([], inst('timelocked_vault', {}).policy, {}, { height: 60, fee: 1, terminal: true, input: { amount: 10 }, payout: { amount: 1, owner: 'x' } }).error.code === 'Shape');
t('describe 16 lines', VM.describe(inst('period_budget_wallet', {}).program).length === 16);
console.log(VM.describe(inst('period_budget_wallet', {}).program).slice(0, 8).join('\n'));
const tr = payment(inst('recurring_payment', {}), input(), 100, 5, 50).trace;
t('trace has 16 steps', tr.length === 16 && tr[0].regsBefore && tr[3].regsAfter[1] === '110', tr[3]);

console.log(`\n${pass} passed, ${failN} failed`);
process.exit(failN ? 1 : 0);
