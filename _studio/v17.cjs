// V17: mainnet hype, every feature, fast cuts → src/v17-mainnet.html
'use strict';
const fs = require('fs'), path = require('path');
const v = fs.readFileSync(path.join(__dirname, 'vids.cjs'), 'utf8'); let MARK, HEAD, LIB, END, page, tour, endCard; const SRC = path.join(__dirname, 'src');
eval(v.slice(v.indexOf('const MARK ='), v.indexOf('// ---------- V1')).replace(/^const (MARK|HEAD|LIB|END|page) =/gm, '$1 ='));
eval(v.slice(v.indexOf('const tour ='), v.indexOf("tour('v3-wallet.html'")).replace(/^const (tour|endCard) =/gm, '$1 ='));
const FS = [['genesis', 'A block is found. Proven, then mined.', 'm3-found', '/mine', [0, 60], 1.15, 80],
  ['every block, live', 'The explorer sees it all.', 'm4-explorer', '/explorer', [0, 120]],
  ['wallet', 'A photo becomes your key.', 'w2-photo', '/wallet', [0, 80], 1.1, 40],
  ['send', 'No signatures. Just proof.', 'w5-sent', '/wallet', [0, 80]],
  ['launch', 'Deploy a token in one click.', 'lp-create', '/launchpad', [0, 100], 1.1, 60],
  ['swap', 'Trade on the curve. Instantly.', 'lp-trade', '/launchpad', [0, 120], 1.15, 100],
  ['liquidity', 'Graduate into native pools.', 'lp-liq', '/launchpad', [0, 80]],
  ['mint', 'NFTs with on-chain art.', 'nft-create', '/nft', [0, 60], 1.1, 0],
  ['marketplace', 'Bought and paid in one block.', 'nft-market', '/nft', [0, 100]],
  ['names', 'you.kairos, everywhere.', 'names-avail', '/names', [0, 40], 1.15, 60],
  ['verify', 'Re-check the whole chain yourself.', 'vf-done', '/verify', [0, 60]],
  ['station', 'A world built on it.', 'wd-hall', '/world', [0, 40], 1.1, 40],
  ['season 1', 'Everyone earning.', 'season-board', '/season', [0, 120], 1.15, 60]];
let t0 = 3.2; const SC = FS.map(([k, tt, im, p, y, z, x], i) => [+(t0 + i * 2.1).toFixed(2), String(i + 1).padStart(2, '0') + ' · ' + k, tt, im, p, y, z, x]);
const ENDT = +(t0 + FS.length * 2.1).toFixed(2);
tour('v17-mainnet.html', ['kairos mainnet', 'One chain.<br><span class="g">Everything on it.</span>', 'proof-native · post-quantum · coming soon'], SC, ENDT, endCard('Mainnet<br><span class="g">is coming.</span>'));
console.log('v17 written', ENDT);
