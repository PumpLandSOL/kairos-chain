// V15: .kairos names, 24 s → src/v15-names.html (real captures)
'use strict';
const fs = require('fs'), path = require('path');
const v = fs.readFileSync(path.join(__dirname, 'vids.cjs'), 'utf8'); let MARK, HEAD, LIB, END, page, tour, endCard; const SRC = path.join(__dirname, 'src');
eval(v.slice(v.indexOf('const MARK ='), v.indexOf('// ---------- V1')).replace(/^const (MARK|HEAD|LIB|END|page) =/gm, '$1 ='));
eval(v.slice(v.indexOf('const tour ='), v.indexOf("tour('v3-wallet.html'")).replace(/^const (tour|endCard) =/gm, '$1 ='));
tour('v15-names.html', ['new · .kairos names', 'Your name.<br><span class="g">Every address.</span>', 'live on the kairos web testnet · real capture'],
  [[3.4, '01 · claim a name', 'Search it. Register it. Yours for good.', 'names-avail', '/names', [0, 40], 1.15, 60],
   [8.6, '02 · it follows you', 'Every spend rotates your address. Your name moves with it.', 'names-hero', '/names', [100, 260]],
   [13.4, '03 · resolve anyone', 'Any name points to its owner\'s live address.', 'names-taken', '/names', [0, 60], 1.15, 60],
   [18, '04 · send to a name', 'Type name.kairos in the wallet. Done.', 'names-wallet', '/wallet', [300, 420], 1.3, 500]], 22, endCard('No hex. No stale addresses.<br><span class="g">.kairos names.</span>'));
console.log('v15 written');
