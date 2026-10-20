/*
 * kairos-vm.js — dependency-free JavaScript port of the Kairos Chain contract
 * "integer core" (object ABI 3, 16 instructions), for the in-browser playground.
 *
 * Source of truth (Rust, read-only):
 *   noid_tx/src/experimental_object/integer_program.rs   (VM)            -> "IP:<line>"
 *   noid_tx/src/experimental_object/policy.rs            (rules/modes)   -> "POL:<line>"
 *   noid_tx/src/experimental_object.rs                   (check_call)    -> "OBJ:<line>"
 *   noid_tx/src/experimental_object/applications.rs      (6 templates)   -> "APP:<line>"
 *   noid_tx/src/paged_spend.rs                           (value balance) -> "PS:<line>"
 *   noid_rpc/src/server/objects.rs                       (RPC preview)   -> "RPC:<line>"
 *   noid_gui/src/contracts.rs                            (labels/formula)-> "GUI:<line>"
 *   docs/contracts/core.md, lifecycle.md, templates.md
 *
 * All u64 quantities are BigInt internally. Inputs may be number | string | bigint.
 * Exposes window.KairosVM in browsers and module.exports in Node.
 */
(function (root) {
  'use strict';

  var U64_MAX = (1n << 64n) - 1n;
  var PROGRAM_STEPS = 16;                                   // IP:13
  var OBJECT_VERSION = 3;                                   // OBJ:32

  // ---- enums, in Rust discriminant order (IP:24-29, 46-71, 105-116, 136-143)
  var REGISTERS = ['state0', 'state1', 'scratch0', 'scratch1'];
  var OPERANDS = ['state0', 'state1', 'scratch0', 'scratch1', 'immediate', 'height', 'fee',
    'payout', 'retained', 'input_amount', 'before_deadline', 'terminal', 'has_payout', 'zero',
    'one', 'after_deadline', 'payout_owner0', 'payout_owner1', 'payout_owner2', 'payout_owner3',
    'input_creation_id', 'input_slot', 'retained_slot', 'payout_slot'];
  var OPCODES = ['keep', 'move', 'add', 'subtract', 'min', 'max', 'less_than', 'equal',
    'assert_equal', 'assert_less_or_equal'];
  var PREDICATES = ['always', 'before_deadline', 'terminal', 'has_payout', 'scratch0', 'scratch1'];

  // ---- mode bits (POL:7-14)
  var MODES = {
    CLAIM_CONTINUE: 1, CLAIM_CLOSE: 2, RECOVERY_CONTINUE: 4, RECOVERY_CLOSE: 8,
    ANY_PAYOUT_RECIPIENT: 16, VALID_MODES: 31
  };

  // ---------------------------------------------------------------- helpers
  function u64(v, what) {
    var b;
    if (typeof v === 'bigint') b = v;
    else if (typeof v === 'number') {
      if (!Number.isSafeInteger(v)) throw new Error(what + ': not a safe integer');
      b = BigInt(v);
    } else if (typeof v === 'string') {
      // core.md "Policy and commitment": canonical decimal, no sign/leading zero.
      if (!/^(0|[1-9][0-9]*)$/.test(v)) throw new Error(what + ': not a canonical decimal string');
      b = BigInt(v);
    } else if (v === undefined || v === null) b = 0n;
    else throw new Error(what + ': bad integer');
    if (b < 0n || b > U64_MAX) throw new Error(what + ': outside u64');
    return b;
  }
  function u32(v, what) {
    var b = u64(v, what);
    if (b > 0xffffffffn) throw new Error(what + ': outside u32');
    return b;
  }
  function str(b) { return b.toString(); }

  // Owner words: "four little-endian u64 chunks of the canonical 32-byte owner"
  // (IP:244-245, IP:274-280). A 64-hex-char string is decoded as the 32 bytes;
  // any other label (playground names like "alice") is UTF-8 encoded and
  // zero-padded/truncated to 32 bytes. Real bech32 addresses are NOT decoded
  // here (playground simplification).
  function ownerBytes(owner) {
    var bytes = new Uint8Array(32);
    if (typeof owner === 'string' && /^(0x)?[0-9a-fA-F]{64}$/.test(owner)) {
      var h = owner.replace(/^0x/, '');
      for (var i = 0; i < 32; i++) bytes[i] = parseInt(h.substr(i * 2, 2), 16);
    } else if (owner != null) {
      var enc = typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(String(owner))
        : Buffer.from(String(owner), 'utf8');
      bytes.set(enc.subarray(0, 32));
    }
    return bytes;
  }
  function ownerWords(owner) {
    var b = ownerBytes(owner), out = [];
    for (var w = 0; w < 4; w++) {
      var x = 0n;
      for (var k = 7; k >= 0; k--) x = (x << 8n) | BigInt(b[w * 8 + k]);
      out.push(x);
    }
    return out;
  }
  function sameOwner(a, b) {
    var x = ownerBytes(a), y = ownerBytes(b);
    for (var i = 0; i < 32; i++) if (x[i] !== y[i]) return false;
    return true;
  }

  // ------------------------------------------------------ instruction codec
  function normInstruction(ins, step) {
    ins = ins || {};
    var p = ins.predicate || {};
    var n = {
      opcode: ins.opcode || 'keep',
      destination: ins.destination || 'state0',
      left: ins.left || 'state0',
      right: ins.right || 'state0',
      predicate: { source: p.source || 'always', inverted: !!p.inverted },
      immediate: ins.immediate === undefined ? 0n : ins.immediate
    };
    // Instruction::from_fields rejects unknown codes and immediates > u64 (IP:225-241).
    if (OPCODES.indexOf(n.opcode) < 0 || REGISTERS.indexOf(n.destination) < 0 ||
        OPERANDS.indexOf(n.left) < 0 || OPERANDS.indexOf(n.right) < 0 ||
        PREDICATES.indexOf(n.predicate.source) < 0) {
      var e = new Error('Opcode'); e.step = step; throw e;
    }
    try { n.immediate = u64(n.immediate, 'immediate'); } catch (_) { var e2 = new Error('Opcode'); e2.step = step; throw e2; }
    return n;
  }
  // 20-bit descriptor: opcode 4 | dest 2 | left 5 | right 5 | predicate 3 | inverted 1 (IP:215-223)
  function encodeInstruction(ins) {
    var n = normInstruction(ins, 0);
    var d = OPCODES.indexOf(n.opcode) | (REGISTERS.indexOf(n.destination) << 4) |
      (OPERANDS.indexOf(n.left) << 6) | (OPERANDS.indexOf(n.right) << 11) |
      (PREDICATES.indexOf(n.predicate.source) << 16) | ((n.predicate.inverted ? 1 : 0) << 19);
    return { descriptor: d, immediate: str(n.immediate) };
  }
  function decodeInstruction(descriptor, immediate) {
    var w = BigInt(descriptor);
    if (w >> 20n !== 0n) return null;                       // IP:227
    var imm = BigInt(immediate || 0);
    if (imm < 0n || imm > U64_MAX) return null;
    var d = Number(w);
    var op = OPCODES[d & 15], l = OPERANDS[(d >> 6) & 31], r = OPERANDS[(d >> 11) & 31],
      ps = PREDICATES[(d >> 16) & 7];
    if (!op || !l || !r || !ps) return null;               // IP:231-236
    return { opcode: op, destination: REGISTERS[(d >> 4) & 3], left: l, right: r,
      predicate: { source: ps, inverted: (d & (1 << 19)) !== 0 }, immediate: str(imm) };
  }
  // Pads to 16 steps; "Unused trailing instructions are canonical keep" (core.md;
  // EMPTY_PROGRAM = all-zero fields = keep state0,state0,state0 always 0, IP:19).
  function normProgram(program) {
    program = program || [];
    if (program.length > PROGRAM_STEPS) throw new Error('Shape: program longer than 16 instructions');
    var out = [];
    for (var i = 0; i < PROGRAM_STEPS; i++) out.push(normInstruction(program[i], i));
    return out;
  }

  // ------------------------------------------------------------- describe
  // Mirrors ProgramStep::formula (GUI:97-127).
  function describe(program) {
    var prog = normProgram(program);
    return prog.map(function (s, i) {
      var opd = function (x) { return x === 'immediate' ? str(s.immediate) : x; };
      var L = opd(s.left), R = opd(s.right), d = s.destination, rhs;
      switch (s.opcode) {
        case 'keep': rhs = 'keep'; break;
        case 'move': rhs = d + ' = ' + L; break;
        case 'add': rhs = d + ' = ' + L + ' + ' + R; break;
        case 'subtract': rhs = d + ' = ' + L + ' - ' + R; break;
        case 'less_than': rhs = d + ' = (' + L + ' < ' + R + ')'; break;
        case 'equal': rhs = d + ' = (' + L + ' == ' + R + ')'; break;
        case 'assert_equal': rhs = 'assert ' + L + ' == ' + R; break;
        case 'assert_less_or_equal': rhs = 'assert ' + L + ' <= ' + R; break;
        default: rhs = d + ' = ' + s.opcode + '(' + L + ', ' + R + ')';
      }
      var line = (s.predicate.source === 'always' && !s.predicate.inverted) ? rhs
        : 'if ' + (s.predicate.inverted ? '!' : '') + s.predicate.source + ': ' + rhs;
      return (i < 10 ? ' ' : '') + i + '  ' + line;
    });
  }

  // ---------------------------------------------------------------- policy
  function modesByte(m) {
    if (typeof m === 'number') return m;
    if (!m) return 0;
    return (m.claim_continue ? 1 : 0) | (m.claim_close ? 2 : 0) | (m.recovery_continue ? 4 : 0) |
      (m.recovery_close ? 8 : 0) | (m.any_payout_recipient ? 16 : 0);
  }
  function normPolicy(p) {
    return {
      claim_authority: p.claim_authority, recovery_authority: p.recovery_authority,
      claim_recipient: p.claim_recipient, recovery_recipient: p.recovery_recipient,
      deadline: u64(p.deadline, 'deadline'),
      max_fee: u64(p.max_fee, 'max_fee'), min_retained: u64(p.min_retained, 'min_retained'),
      max_payout: u64(p.max_payout, 'max_payout'), modes: modesByte(p.modes)
    };
  }
  // ObjectRules::permits (POL:47-56)
  function permits(modes, beforeDeadline, terminal) {
    var bit = beforeDeadline ? (terminal ? MODES.CLAIM_CLOSE : MODES.CLAIM_CONTINUE)
      : (terminal ? MODES.RECOVERY_CLOSE : MODES.RECOVERY_CONTINUE);
    return (modes & bit) !== 0;
  }

  // ------------------------------------------------------------- execution
  // integer_program::execute (IP:361-410). Returns {ok, error?, trace, regs}.
  function execute(prog, s0, s1, ctx) {
    var regs = [s0, s1, 0n, 0n];                           // scratch reset every call (IP:368)
    var trace = [];
    for (var step = 0; step < PROGRAM_STEPS; step++) {
      var ins = prog[step];
      // predicate table (IP:317-326)
      var preds = [1n, ctx.before_deadline ? 1n : 0n, ctx.terminal ? 1n : 0n,
        ctx.has_payout ? 1n : 0n, regs[2], regs[3]];
      var pv = preds[PREDICATES.indexOf(ins.predicate.source)];
      var before = regs.slice();
      var entry = { pc: step, op: ins.opcode, destination: ins.destination,
        operands: { left: ins.left, right: ins.right, immediate: str(ins.immediate) },
        predicate: { source: ins.predicate.source, inverted: ins.predicate.inverted, value: str(pv) },
        regsBefore: regs.map(str) };
      if (pv > 1n) {                                        // IP:372-374
        entry.active = false; entry.error = 'NonBooleanPredicate'; entry.regsAfter = entry.regsBefore;
        trace.push(entry);
        return { ok: false, error: { code: 'Program', kind: 'NonBooleanPredicate', step: step }, trace: trace, regs: regs };
      }
      var active = (pv === 1n) !== ins.predicate.inverted; // IP:375-377
      entry.active = active;
      if (!active) { entry.regsAfter = entry.regsBefore; trace.push(entry); continue; }
      // operand table (IP:288-315)
      var ops = [regs[0], regs[1], regs[2], regs[3], ins.immediate, ctx.height, ctx.fee, ctx.payout,
        ctx.retained, ctx.input_amount, ctx.before_deadline ? 1n : 0n, ctx.terminal ? 1n : 0n,
        ctx.has_payout ? 1n : 0n, 0n, 1n, ctx.before_deadline ? 0n : 1n,
        ctx.payout_owner[0], ctx.payout_owner[1], ctx.payout_owner[2], ctx.payout_owner[3],
        ctx.input_creation_id, ctx.input_slot, ctx.retained_slot, ctx.payout_slot];
      var L = ops[OPERANDS.indexOf(ins.left)], R = ops[OPERANDS.indexOf(ins.right)];
      entry.operands.leftValue = str(L); entry.operands.rightValue = str(R);
      var d = REGISTERS.indexOf(ins.destination), v, fail = null;
      switch (ins.opcode) {                                 // IP:382-407
        case 'keep': v = regs[d]; break;
        case 'move': v = L; break;
        case 'add': v = L + R; if (v > U64_MAX) fail = 'Overflow'; break;       // checked_add
        case 'subtract': v = L - R; if (v < 0n) fail = 'Underflow'; break;     // checked_sub
        case 'min': v = L < R ? L : R; break;
        case 'max': v = L > R ? L : R; break;
        case 'less_than': v = L < R ? 1n : 0n; break;
        case 'equal': v = L === R ? 1n : 0n; break;
        case 'assert_equal': if (L !== R) fail = 'Assertion'; v = regs[d]; break;
        case 'assert_less_or_equal': if (L > R) fail = 'Assertion'; v = regs[d]; break;
      }
      if (fail) {
        entry.error = fail; entry.regsAfter = entry.regsBefore; trace.push(entry);
        return { ok: false, error: { code: 'Program', kind: fail, step: step }, trace: trace, regs: before };
      }
      regs[d] = v;
      entry.regsAfter = regs.map(str);
      trace.push(entry);
    }
    return { ok: true, trace: trace, regs: regs };
  }

  var MESSAGES = {
    Opcode: 'program contains an invalid instruction encoding',
    Policy: 'the committed mode flags do not permit this branch (continue/close before/after deadline)',
    Shape: 'transaction shape not allowed (a close cannot carry a second payment)',
    Balance: 'input amount cannot cover fee + payout',
    FeeLimit: 'fee exceeds the committed max_fee',
    ReserveLimit: 'retained amount below the committed min_retained',
    PayoutLimit: 'payout exceeds the committed per-call max_payout',
    Recipient: 'payout recipient is not the deadline-selected recipient',
    Authority: 'signer is not the deadline-selected authority',
    ZeroOutput: 'every live output must have a positive amount',
    Program: 'program execution failed'
  };
  function fail(code, extra, base) {
    var r = base || {};
    r.ok = false;
    r.error = Object.assign({ code: code, message: MESSAGES[code] || code }, extra || {});
    if (code === 'Program' && extra) r.error.message = 'program ' + extra.kind + ' at step ' + extra.step;
    return r;
  }

  /*
   * run(program, policy, state, call)
   *   program: up to 16 {opcode,destination,left,right,predicate:{source,inverted},immediate}
   *   policy:  {claim_authority, recovery_authority, claim_recipient, recovery_recipient,
   *             deadline, max_fee, min_retained, max_payout, modes (byte or flag object)}
   *   state:   {state0, state1}
   *   call:    {height, fee, terminal, input:{amount, slot, creation_id}, retained_slot,
   *             payout?:{amount, owner, slot}, signer?, enforcePositiveOutputs? (default true)}
   * Check order follows ObjectOpening::build_call_inner + check_call (OBJ:249-305, OBJ:157-213),
   * i.e. the path the RPC previewObjectCall uses (RPC:563-578, RPC:620).
   */
  function run(program, policy, state, call) {
    var res = { ok: true, trace: [] };
    var prog, pol, c;
    try { prog = normProgram(program); }
    catch (e) { return fail(e.message === 'Opcode' ? 'Opcode' : 'Shape', { step: e.step, detail: e.message }, res); }
    try {
      pol = normPolicy(policy || {});
      c = call || {};
      var input = c.input || {};
      var height = u64(c.height, 'height'), fee = u64(c.fee, 'fee');
      var inAmt = u64(input.amount, 'input.amount');
      var hasPayout = !!c.payout;
      var payoutAmt = c.payout ? u64(c.payout.amount, 'payout.amount') : 0n;
      var s0 = u64(state && state.state0, 'state0'), s1 = u64(state && state.state1, 'state1');
      var inSlot = u32(input.slot, 'input.slot'), creation = u64(input.creation_id, 'input.creation_id');
      var retSlot = u32(c.retained_slot, 'retained_slot');
      var paySlot = c.payout ? u32(c.payout.slot, 'payout.slot') : 0n;
    } catch (e) { return fail('Encoding', { detail: e.message }, res); }
    var terminal = !!c.terminal;

    // ObjectRules::validate: reserved mode bits (POL:41-46, OBJ:85-86)
    if (pol.modes & ~MODES.VALID_MODES) return fail('Policy', { detail: 'reserved mode bits' }, res);
    // RPC: "closing a contract does not accept a second payment" (RPC:482-486);
    // check_call: terminal bitmap may not carry output 1 (OBJ:166-178) -> Shape.
    if (terminal && hasPayout) return fail('Shape', null, res);

    var beforeDeadline = height < pol.deadline;                         // OBJ:131-137, IP:271
    var authority = beforeDeadline ? pol.claim_authority : pol.recovery_authority;   // OBJ:131
    var recipient = beforeDeadline ? pol.claim_recipient : pol.recovery_recipient;   // OBJ:139
    res.branch = beforeDeadline ? 'claim' : 'recovery';
    res.authority = authority;

    // build_call_inner: retained = input - fee - payout, else Balance (OBJ:268-275);
    // value conservation input = outputs + fee (PS:486-495, lifecycle.md §4).
    var retained = inAmt - fee - payoutAmt;
    if (retained < 0n) return fail('Balance', null, res);

    // Physical-position context (IP:264-286, core.md "follows physical output positions").
    var ctx = {
      height: height, fee: fee, payout: payoutAmt, retained: retained, input_amount: inAmt,
      before_deadline: beforeDeadline, terminal: terminal, has_payout: hasPayout,
      payout_owner: hasPayout ? ownerWords(c.payout.owner) : [0n, 0n, 0n, 0n],
      input_creation_id: creation, input_slot: inSlot, retained_slot: retSlot, payout_slot: paySlot
    };
    res.context = {};
    Object.keys(ctx).forEach(function (k) {
      var v = ctx[k];
      res.context[k] = Array.isArray(v) ? v.map(str) : typeof v === 'bigint' ? str(v) : v;
    });

    var exec = null;
    // Continuing calls execute the program while building the successor root,
    // BEFORE check_call's policy checks (OBJ:296-300). Closing calls execute
    // only inside check_call (OBJ:201).
    if (!terminal) {
      exec = execute(prog, s0, s1, ctx);
      res.trace = exec.trace;
      if (!exec.ok) return fail('Program', exec.error, res);
    }
    // check_call order (OBJ:180-200)
    if (!permits(pol.modes, beforeDeadline, terminal)) return fail('Policy', null, res);   // OBJ:183-185
    if (fee > pol.max_fee) return fail('FeeLimit', null, res);                             // OBJ:186-188
    if (!terminal) {
      if (retained < pol.min_retained) return fail('ReserveLimit', null, res);             // OBJ:190-192
      if (payoutAmt > pol.max_payout) return fail('PayoutLimit', null, res);               // OBJ:193-195
      if (hasPayout && (pol.modes & MODES.ANY_PAYOUT_RECIPIENT) === 0 &&
          !sameOwner(c.payout.owner, recipient)) return fail('Recipient', null, res);      // OBJ:196-201
    }
    if (terminal) {
      exec = execute(prog, s0, s1, ctx);                                                   // OBJ:202
      res.trace = exec.trace;
      if (!exec.ok) return fail('Program', exec.error, res);
    }
    // Playground-only: the Rust relation proves the selected authority's
    // signature capsule (lifecycle.md §3); there is no comparable value check in
    // check_call, so we only compare when the caller names a signer.
    if (c.signer !== undefined && c.signer !== null && !sameOwner(c.signer, authority))
      return fail('Authority', null, res);
    // lifecycle.md §4: "Every live output must have a positive amount." Enforcement
    // site not located in noid_tx (see report); disable with enforcePositiveOutputs:false.
    if (c.enforcePositiveOutputs !== false) {
      if (retained === 0n || (hasPayout && payoutAmt === 0n)) return fail('ZeroOutput', null, res);
    }

    res.ok = true;
    res.fee = str(fee);
    res.terminal = terminal;
    res.lifecycle = terminal ? 'close' : 'continue';
    if (terminal) {
      // RPC semantic result: closing amount reported as payout, retained 0 (RPC:625-640).
      res.retained = '0';
      res.payout = { amount: str(retained), owner: recipient };
      res.newState = null;      // no successor on close (core.md; OBJ:203-206)
      res.finalRegisters = { state0: str(exec.regs[0]), state1: str(exec.regs[1]) };
    } else {
      res.retained = str(retained);
      res.payout = hasPayout ? { amount: str(payoutAmt), owner: c.payout.owner } : null;
      res.newState = { state0: str(exec.regs[0]), state1: str(exec.regs[1]) };   // IP:409
    }
    return res;
  }

  // -------------------------------------------------------------- templates
  function I(opcode, dest, left, right, imm, pred) {
    return { opcode: opcode, destination: dest, left: left, right: right,
      predicate: pred || { source: 'always', inverted: false }, immediate: str(BigInt(imm || 0)) };
  }
  var BEFORE = { source: 'before_deadline', inverted: false };
  var NOT_BEFORE = { source: 'before_deadline', inverted: true };
  var RESET = { source: 'scratch0', inverted: true };

  function policyOf(claimAuth, recAuth, deadline, claimRec, recRec, maxFee, minRet, maxPay, modes) {
    return { claim_authority: claimAuth, recovery_authority: recAuth, deadline: str(u64(deadline, 'deadline')),
      claim_recipient: claimRec, recovery_recipient: recRec, max_fee: str(u64(maxFee, 'max_fee')),
      min_retained: str(u64(minRet, 'min_retained')), max_payout: str(u64(maxPay, 'max_payout')), modes: modes };
  }
  // validate_schedule (APP:115-128)
  function validateSchedule(start, period, deadline) {
    if (period === 0n) throw new Error('EmptyPeriod');
    if (start >= deadline) throw new Error('DeadlineBeforeStart');
    if ((deadline - 1n) + period > U64_MAX) throw new Error('HeightOverflow');
  }
  // allowance_wallet (APP:66-96)
  function allowance(spend, recover, payoutRecipient, recoverAt, maxFee, maxPayout, minRetained) {
    return policyOf(spend, recover, recoverAt, payoutRecipient || spend, recover, maxFee, minRetained, maxPayout,
      MODES.CLAIM_CONTINUE | MODES.RECOVERY_CLOSE | (payoutRecipient ? 0 : MODES.ANY_PAYOUT_RECIPIENT));
  }
  function maxB(a, b) { return a > b ? a : b; }

  var TEMPLATES = [
    {
      id: 'refundable_payment', label: 'PAYMENT WITH REFUND', // GUI:333
      description: 'Payee may close and collect the whole balance (minus fee) before expiry; payer may close and recover it at or after expiry. No continuing call is permitted, so it cannot be partially drained.',
      params: [
        { key: 'payer', type: 'address', default: 'payer' },
        { key: 'payee', type: 'address', default: 'payee' },
        { key: 'expiry_height', type: 'u64', default: '50' },
        { key: 'max_fee', type: 'u64', default: '100' }
      ],
      build: function (p) {                                   // APP:19-40
        return { program: [], state: { state0: '0', state1: '0' },
          policy: policyOf(p.payee, p.payer, p.expiry_height, p.payee, p.payer, p.max_fee, 0, 0,
            MODES.CLAIM_CLOSE | MODES.RECOVERY_CLOSE) };
      }
    },
    {
      id: 'timelocked_vault', label: 'TIMELOCKED VAULT',
      description: 'No spend of any kind before unlock_height, even by the owner. At or after it, the owner may close and withdraw everything minus a capped fee.',
      params: [
        { key: 'owner', type: 'address', default: 'owner' },
        { key: 'unlock_height', type: 'u64', default: '50' },
        { key: 'max_fee', type: 'u64', default: '100' }
      ],
      build: function (p) {                                   // APP:44-60
        return { program: [], state: { state0: '0', state1: '0' },
          policy: policyOf(p.owner, p.owner, p.unlock_height, p.owner, p.owner, p.max_fee, 0, 0, MODES.RECOVERY_CLOSE) };
      }
    },
    {
      id: 'allowance_wallet', label: 'ALLOWANCE WALLET',
      description: 'Before recover_at the spending key may make continuing payments of at most max_payout per call (fee excluded) while keeping min_retained in the contract; it can never close. A null payout_recipient lets it pay anyone. At or after recover_at only the recovery key may close for the remainder. The cap is per call, not per day.',
      params: [
        { key: 'spending_key', type: 'address', default: 'spender' },
        { key: 'recovery_key', type: 'address', default: 'recovery' },
        { key: 'payout_recipient', type: 'address?', default: 'payee' },
        { key: 'recover_at', type: 'u64', default: '50' },
        { key: 'max_fee', type: 'u64', default: '100' },
        { key: 'max_payout', type: 'u64', default: '500' },
        { key: 'min_retained', type: 'u64', default: '9400' }
      ],
      build: function (p) {
        return { program: [], state: { state0: '0', state1: '0' },
          policy: allowance(p.spending_key, p.recovery_key, p.payout_recipient || null, p.recover_at,
            p.max_fee, p.max_payout, p.min_retained) };
      }
    },
    {
      id: 'period_budget_wallet', label: 'PERIOD BUDGET',
      description: 'Spending starts at start_height. Each continuing call debits payout + fee from the window budget. Once height reaches the saved boundary, the next successful call resets the budget and sets the boundary to that call height + period_blocks (unused budget is discarded). Effective reserve is max(min_retained, max_fee). Recovery key closes at recover_at, bypassing the budget. Counters: [remaining_budget, window_end].',
      params: [
        { key: 'spending_key', type: 'address', default: 'spender' },
        { key: 'recovery_key', type: 'address', default: 'recovery' },
        { key: 'payout_recipient', type: 'address?', default: null },
        { key: 'start_height', type: 'u64', default: '100' },
        { key: 'period_blocks', type: 'u64', default: '10' },
        { key: 'budget', type: 'u64', default: '100' },
        { key: 'recover_at', type: 'u64', default: '150' },
        { key: 'max_fee', type: 'u64', default: '10' },
        { key: 'max_payout', type: 'u64', default: '100' },
        { key: 'min_retained', type: 'u64', default: '20' }
      ],
      build: function (p) {                                   // APP:154-206
        var start = u64(p.start_height), period = u64(p.period_blocks), budget = u64(p.budget),
          rec = u64(p.recover_at), maxFee = u64(p.max_fee);
        validateSchedule(start, period, rec);
        if (budget === 0n) throw new Error('EmptyAmount');
        if (maxFee > budget) throw new Error('FeeExceedsBudget');
        if (start + period > U64_MAX) throw new Error('HeightOverflow'); // Rust `+` would panic (APP:176)
        return {
          state: { state0: str(budget), state1: str(start + period) },
          policy: allowance(p.spending_key, p.recovery_key, p.payout_recipient || null, rec, maxFee,
            p.max_payout, maxB(u64(p.min_retained), maxFee)),
          program: [
            I('assert_less_or_equal', 'state0', 'immediate', 'height', start, BEFORE),
            I('less_than', 'scratch0', 'height', 'state1', 0),
            I('move', 'scratch0', 'one', 'zero', 0, NOT_BEFORE),
            I('move', 'state0', 'immediate', 'zero', budget, RESET),
            I('add', 'state1', 'height', 'immediate', period, RESET),
            I('add', 'scratch1', 'fee', 'payout', 0, BEFORE),
            I('assert_less_or_equal', 'state0', 'scratch1', 'state0', 0, BEFORE),
            I('subtract', 'state0', 'state0', 'scratch1', 0, BEFORE)
          ]
        };
      }
    },
    {
      id: 'recurring_payment', label: 'RECURRING PAYMENT',
      description: 'Payee may claim exactly `payment` once due (height >= next_due). Each success sets next_due = call height + period_blocks, so missed periods do not accumulate. A max_fee reserve stays in the contract. Payer closes at recover_at for the remainder. Counters: [successful_claims, next_due_height].',
      params: [
        { key: 'payer', type: 'address', default: 'payer' },
        { key: 'payee', type: 'address', default: 'payee' },
        { key: 'first_due_height', type: 'u64', default: '100' },
        { key: 'period_blocks', type: 'u64', default: '10' },
        { key: 'payment', type: 'u64', default: '50' },
        { key: 'recover_at', type: 'u64', default: '180' },
        { key: 'max_fee', type: 'u64', default: '5' }
      ],
      build: function (p) {                                   // APP:222-265
        var first = u64(p.first_due_height), period = u64(p.period_blocks), pay = u64(p.payment),
          rec = u64(p.recover_at), maxFee = u64(p.max_fee);
        validateSchedule(first, period, rec);
        if (pay === 0n) throw new Error('EmptyAmount');
        return {
          state: { state0: '0', state1: str(first) },
          policy: allowance(p.payee, p.payer, p.payee, rec, maxFee, pay, maxFee),
          program: [
            I('assert_less_or_equal', 'state0', 'state1', 'height', 0, BEFORE),
            I('assert_equal', 'state0', 'payout', 'immediate', pay, BEFORE),
            I('add', 'state0', 'state0', 'one', 0, BEFORE),
            I('add', 'state1', 'height', 'immediate', period, BEFORE)
          ]
        };
      }
    },
    {
      id: 'tranche_vesting', label: 'GRADUAL UNLOCK',
      description: 'Beneficiary claims exactly one tranche per call once height >= next_due; next_due advances by period_blocks from the PREVIOUS due height, so missed tranches stay claimable one call at a time. At mature_at the beneficiary closes for the remainder. Counters: [released_amount, next_due_height].',
      params: [
        { key: 'beneficiary', type: 'address', default: 'beneficiary' },
        { key: 'first_unlock_height', type: 'u64', default: '100' },
        { key: 'period_blocks', type: 'u64', default: '10' },
        { key: 'tranche_amount', type: 'u64', default: '50' },
        { key: 'mature_at', type: 'u64', default: '150' },
        { key: 'max_fee', type: 'u64', default: '5' }
      ],
      build: function (p) {                                   // APP:281-323
        var first = u64(p.first_unlock_height), period = u64(p.period_blocks), amt = u64(p.tranche_amount),
          mat = u64(p.mature_at), maxFee = u64(p.max_fee);
        validateSchedule(first, period, mat);
        if (amt === 0n) throw new Error('EmptyAmount');
        return {
          state: { state0: '0', state1: str(first) },
          policy: allowance(p.beneficiary, p.beneficiary, p.beneficiary, mat, maxFee, amt, maxFee),
          program: [
            I('assert_less_or_equal', 'state0', 'state1', 'height', 0, BEFORE),
            I('assert_equal', 'state0', 'payout', 'immediate', amt, BEFORE),
            I('add', 'state0', 'state0', 'payout', 0, BEFORE),
            I('add', 'state1', 'state1', 'immediate', period, BEFORE)
          ]
        };
      }
    }
  ];
  TEMPLATES.forEach(function (t) {
    t.defaults = {};
    t.params.forEach(function (q) { q.editable = true; t.defaults[q.key] = q.default; });
    var b = t.build;
    t.build = function (p) {
      var merged = Object.assign({}, t.defaults, p || {});
      var out = b(merged);
      out.program = normProgram(out.program).map(function (s) {
        return { opcode: s.opcode, destination: s.destination, left: s.left, right: s.right,
          predicate: { source: s.predicate.source, inverted: s.predicate.inverted }, immediate: str(s.immediate) };
      });
      return out;
    };
    t.instantiate = function (p) { return t.build(p); };
  });
  function template(id) { return TEMPLATES.filter(function (t) { return t.id === id; })[0]; }

  var api = {
    ABI: OBJECT_VERSION, PROGRAM_STEPS: PROGRAM_STEPS, U64_MAX: U64_MAX.toString(),
    REGISTERS: REGISTERS, OPERANDS: OPERANDS, OPCODES: OPCODES, PREDICATES: PREDICATES, MODES: MODES,
    TEMPLATES: TEMPLATES, template: template,
    run: run, describe: describe, permits: permits,
    encodeInstruction: encodeInstruction, decodeInstruction: decodeInstruction, ownerWords: function (o) { return ownerWords(o).map(str); }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof root !== 'undefined' && root) root.KairosVM = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
