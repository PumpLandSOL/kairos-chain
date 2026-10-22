// V16: Season 1 incentivized testnet → src/v16-season.html
'use strict';
const fs = require('fs'), path = require('path');
const v = fs.readFileSync(path.join(__dirname, 'vids.cjs'), 'utf8'); let MARK, HEAD, LIB, END, page, tour, endCard; const SRC = path.join(__dirname, 'src');
eval(v.slice(v.indexOf('const MARK ='), v.indexOf('// ---------- V1')).replace(/^const (MARK|HEAD|LIB|END|page) =/gm, '$1 ='));
eval(v.slice(v.indexOf('const tour ='), v.indexOf("tour('v3-wallet.html'")).replace(/^const (tour|endCard) =/gm, '$1 ='));
tour('v16-season.html', ['incentivized testnet', 'Season 1<br><span class="g">is live.</span>', 'kairoschain.org/season · real capture'],
  [[3.4, '01 · every action counts', 'Mine, launch, mint, name. It all earns points.', 'season-top', '/season', [0, 120], 1.1, 40],
   [9.4, '02 · the leaderboard', 'Tallied from chain history. Anyone can recompute it.', 'season-board', '/season', [0, 140], 1.15, 60],
   [15.4, '03 · one wallet, one player', 'Addresses rotate on every spend. Season 1 follows them.', 'season-board', '/season', [140, 320], 1.3, 300]], 21, endCard('Snapshot at mainnet genesis.<br><span class="g">Start earning.</span>'));
console.log('v16 written');
