// V14: native NFTs, 24 s → src/v14-nft.html (real captures)
'use strict';
const fs = require('fs'), path = require('path');
const v = fs.readFileSync(path.join(__dirname, 'vids.cjs'), 'utf8'); let MARK, HEAD, LIB, END, page, tour, endCard; const SRC = path.join(__dirname, 'src');
eval(v.slice(v.indexOf('const MARK ='), v.indexOf('// ---------- V1')).replace(/^const (MARK|HEAD|LIB|END|page) =/gm, '$1 ='));
eval(v.slice(v.indexOf('const tour ='), v.indexOf("tour('v3-wallet.html'")).replace(/^const (tour|endCard) =/gm, '$1 ='));
tour('v14-nft.html', ['new · native nfts', 'One of one.<br><span class="g">Proof-native.</span>', 'live on the kairos web testnet · real capture'],
  [[3.4, '01 · create', 'Art drawn from an on-chain seed. Anyone can redraw it.', 'nft-create', '/nft', [0, 60], 1.1, 0],
   [8.6, '02 · the marketplace', 'List any piece in KAIROS.', 'nft-market', '/nft', [0, 80]],
   [13.4, '03 · buy, atomically', 'Payment and ownership change hands in the same block.', 'nft-market', '/nft', [0, 40], 1.4, 140],
   [18, '04 · explore', 'Every NFT minted on the testnet.', 'nft-all', '/nft', [0, 120]]], 22, endCard('No contracts. No EVM.<br><span class="g">Native NFTs.</span>'));
console.log('v14 written');
