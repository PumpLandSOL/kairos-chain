// V13: full walkthrough of the live web testnet, ~66 s → src/v13-walkthrough.html (real captures)
'use strict';
const fs = require('fs'), path = require('path');
const v = fs.readFileSync(path.join(__dirname, 'vids.cjs'), 'utf8'); let MARK, HEAD, LIB, END, page, tour, endCard; const SRC = path.join(__dirname, 'src');
eval(v.slice(v.indexOf('const MARK ='), v.indexOf('// ---------- V1')).replace(/^const (MARK|HEAD|LIB|END|page) =/gm, '$1 ='));
eval(v.slice(v.indexOf('const tour ='), v.indexOf("tour('v3-wallet.html'")).replace(/^const (tour|endCard) =/gm, '$1 ='));
const S = [['01 · start here', 'kairoschain.org: the chain, explained in chapters.', 'h1-home', '/', [0, 60]],
  ['02 · make a wallet', 'Drop a PNG or generate a secret. It never leaves your browser.', 'w1-empty', '/wallet', [120, 200]],
  ['03 · your k1 address', 'Exact pixels in, a 256-bit secret and your address out.', 'w2-photo', '/wallet', [0, 60], 1.15],
  ['04 · get test KAIROS', 'One click on the faucet. It lands in the next block.', 'w4-balance', '/wallet', [0, 40], 1.1, 120],
  ['05 · send it', 'Change moves to a fresh address automatically.', 'w5-sent', '/wallet', [0, 30]],
  ['06 · mine a block', 'Paste your address, pick threads, start.', 'm1-ready', '/mine', [100, 200]],
  ['07 · your tab is hashing', 'The real Kairos proof of work, in your browser.', 'm2-mining', '/mine', [0, 60], 1.1, 60],
  ['08 · block found', '16 test KAIROS, straight to your address.', 'm3-found', '/mine', [80, 160]],
  ['09 · the explorer', 'Every block, its miner and the leaderboard, live.', 'm4-explorer', '/explorer', [0, 120]],
  ['10 · launch a token', 'Fixed supply, redeemable backing, a curve to a native pool.', 'lp-create', '/launchpad', [0, 80]],
  ['11 · trade it', 'Swaps settle next block. Your limit is binding.', 'lp-trade', '/launchpad', [0, 60], 1.1, 120],
  ['12 · run a contract', 'Vaults, allowances and vesting on the real 16-step core.', 'p1-playground', '/playground', [0, 60]],
  ['13 · verify everything', 'Your browser re-checks every block itself.', 'vf-done', '/verify', [0, 60], 1.08, 120],
  ['14 · board the station', 'Walk, chat, pay the crew and mine from the bay.', 'wd-hall', '/world', [0, 40], 1.2, 300]];
let t = 3.4; const scenes = S.map((s) => { const r = [t, s[0], s[1], s[2], s[3], s[4], s[5], s[6]]; t += 4.3; return r; });
tour('v13-walkthrough.html', ['walkthrough · web testnet', 'Use Kairos<br><span class="g">in 60 seconds.</span>', 'everything shown is live today · real capture'], scenes, t,
  endCard('Live today.<br><span class="g">kairoschain.org</span>'));
console.log('v13 written, end at', t.toFixed(1));
