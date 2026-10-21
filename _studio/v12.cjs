// V12: KAIROS STATION, 24 s → src/v12-world.html (real captures)
'use strict';
const fs = require('fs'), path = require('path');
const v = fs.readFileSync(path.join(__dirname, 'vids.cjs'), 'utf8'); let MARK, HEAD, LIB, END, page, tour, endCard; const SRC = path.join(__dirname, 'src');
eval(v.slice(v.indexOf('const MARK ='), v.indexOf('// ---------- V1')).replace(/^const (MARK|HEAD|LIB|END|page) =/gm, '$1 ='));
eval(v.slice(v.indexOf('const tour ='), v.indexOf("tour('v3-wallet.html'")).replace(/^const (tour|endCard) =/gm, '$1 ='));
tour('v12-world.html', ['new · kairos station', 'A world on Kairos.<br><span class="g">Board it now.</span>', 'kairoschain.org/world · real capture'],
  [[3.4, '01 · board the station', 'Your wallet is created in your browser. Nobody else holds it.', 'wd-hall', '/world', [0, 40], 1.05, 0],
   [8.6, '02 · meet the crew', 'Chat, walk, and pay any crew member in test KAIROS.', 'wd-hall', '/world', [80, 160], 1.35, 500],
   [13.8, '03 · the mining bay', 'Press E and your tab mines real Kairos blocks.', 'wd-mine', '/world', [0, 40], 1.25, 0],
   [18.4, '04 · live network terminal', 'The chain, readable from inside the world.', 'wd-mine', '/world', [0, 300], 1.1, 0]], 22.4, endCard('Proof-native.<br><span class="g">And playable.</span>'));
console.log('v12 written');
