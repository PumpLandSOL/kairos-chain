// Kairos X kit: node tweets.cjs → brand/X-KIT.md (fails if any tweet is over 245 characters)
const fs = require('fs'), path = require('path');
const BIO = 'Kairos Chain. A proof-native Layer 1: every block carries one recursive proof of the entire chain. No replay. No signatures. No trusted setup. $KAI';
const T = [
  ['kairos-hype-20s.mp4', `Kairos: the proof-native Layer 1 blockchain.

Every block carries one recursive proof that the entire chain is valid, from genesis to now.

No replay. No signatures. No trusted setup.

kairoschain.org

$KAI`],
  ['kairos-vs.png', `To verify Bitcoin from scratch, you replay every block since 2009.

To verify Solana, you trust a snapshot from a peer.

To verify Kairos, you check one proof. About a second on a laptop, at any chain height.

$KAI`],
  ['kairos-howitworks.png', `How a Kairos block is made:

i. The wallet proves the spend, no signature
ii. The miner proves the block and the one before it
iii. Only then does proof of work begin
iv. Every node verifies one proof

Hashpower alone can't make a block.`],
  ['(text only)', `Kairos has no public keys.

Your address is a hash of a 256-bit secret. To spend, your wallet proves it knows the secret with a fresh zero-knowledge proof.

Nothing on the wire to attack as a key. Nothing to sign.

$KAI`],
  ['(text only)', `Your Kairos wallet can be a photograph.

The pixels are read locally, never uploaded, and hashed into your 256-bit secret. Change one pixel and you get a different wallet.

kairoschain.org/docs

$KAI`],
  ['kairos-keyart.png', `$KAI comes first. The chain comes next.

At Kairos mainnet, every $KAI holder migrates 1:1 into native KAI, written into genesis.

After that, every new KAI is mined. 0% dev allocation. 100% to miners.

$KAI`],
  ['(text only)', `Kairos is built on open source.

It's an independent fork of the Parano1d protocol (Apache-2.0), launched with its own genesis, its own economics and no developer cut. Credit where it's due.

Whitepaper: kairoschain.org/whitepaper`],
  ['kairos-palette.png', `Chronos is time passing.

Kairos is the decisive moment.

One block. One proof. Everything before it.

kairoschain.org

$KAI`],
];
let md = `# Kairos Chain X kit\n\nsite: https://kairoschain.org\n\n## Bio (${[...BIO].length} chars)\n\`\`\`\n${BIO}\n\`\`\`\n\nProfile picture: brand/kairos-pfp.png · Header: brand/kairos-banner.png\n`, bad = 0;
T.forEach(([f, t], i) => { const n = [...t].length; if (n > 245) bad++; console.log(i + 1, n, f); md += `\n## ${i + 1}. ${f}\n\`\`\`\n${t}\n\`\`\`\n`; });
fs.writeFileSync(path.join(__dirname, '..', 'brand', 'X-KIT.md'), md); if (bad) { console.log('OVER LIMIT:', bad); process.exit(1); }
