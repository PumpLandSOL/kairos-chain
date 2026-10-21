// V9: verify-in-your-browser, 24 s → src/v9-verify.html (real captures)
'use strict';
const fs = require('fs'), path = require('path'), SRC = path.join(__dirname, 'src');
const v = fs.readFileSync(path.join(__dirname, 'vids.cjs'), 'utf8'); let MARK, HEAD, LIB, END, page, tour, endCard;
eval(v.slice(v.indexOf('const MARK ='), v.indexOf('// ---------- V1')).replace(/^const (MARK|HEAD|LIB|END|page) =/gm, '$1 ='));
eval(v.slice(v.indexOf('const tour ='), v.indexOf("tour('v3-wallet.html'")).replace(/^const (tour|endCard) =/gm, '$1 ='));
tour('v9-verify.html', ['new · verify in your browser', "Don't trust the explorer.<br><span class=\"g\">Verify the chain.</span>", 'kairoschain.org/verify · real capture'],
  [[3.4, '01 · one click', 'Your browser downloads every block header.', 'vf-start', '/verify', [120, 200]],
   [8.4, '02 · re-checked locally', 'Proof of work, block ids, links and difficulty, all of it.', 'vf-done', '/verify', [0, 60], 1.08, 120],
   [14.2, '03 · nothing taken on faith', 'Same Poseidon2b code the miners run.', 'vf-done', '/verify', [0, 40], 1.22, 700],
   [18.4, '04 · then compare', 'Your result against the live explorer.', 'vf-explorer', '/explorer', [0, 90]]], 22, endCard('Verify,<br><span class="g">don&#39;t trust.</span>'));
console.log('v9 written');
