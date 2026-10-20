// Kairos content haul tweets → brand/X-KIT-HAUL.md (fails if any tweet is over 245 characters)
const fs = require('fs'), path = require('path');
const T = [
  // ---- videos ----
  ['kairos-v1-hype-24s.mp4', `Every other chain asks you to trust its past.

Kairos proves it.

One proof for the whole chain. No public keys. No trusted setup. Post-quantum by construction.

Live today: kairoschain.org

$KAI`],
  ['kairos-v2-explainer-40s.mp4', `How a Kairos block is made:

i. Your wallet proves the spend, no signature
ii. The miner proves the block and the one before it
iii. Only then does proof of work start
iv. Every node checks one proof

kairoschain.org

$KAI`],
  ['kairos-v3-demo-wallet-29s.mp4', `Turn a photo into a Kairos wallet.

Drop a PNG, get a k1 address. Pixels are read in your browser and never uploaded. Then grab test KAI from the faucet and send it.

kairoschain.org/wallet

$KAI`],
  ['kairos-v4-demo-mining-29s.mp4', `Mine a Kairos block from a browser tab.

Paste your address, hit start. Your browser runs the real Kairos proof of work, and every block you find pays 16 test KAI.

kairoschain.org/mine

$KAI`],
  ['kairos-v5-verify-race-22s.mp4', `Verify a chain from zero, same laptop:

Bitcoin: ~36 hours
Ethereum: ~2 days
Solana: ~5 hours, trusting a peer
Kairos: 47 seconds

One ≈1 MB proof covers every block.

kairoschain.org/sync

$KAI`],
  // ---- graphics ----
  ['kairos-g01-proofstack.png', `One arithmetic, end to end.

Addresses, spends, state, recursive history and proof of work all run on one binary proof stack: Poseidon2b, FROST-GKR, FRI-Binius.

No trusted setup anywhere.

$KAI`],
  ['kairos-g02-keyless.png', `On Bitcoin, Ethereum and Solana, every spend puts your public key on chain.

On Kairos there is no public key. You prove you know a secret with a zero-knowledge proof.

No keys to steal. Nothing to sign.

$KAI`],
  ['kairos-g03-photokey.png', `Your wallet can be a photograph.

Exact pixels → BLAKE3 → a 256-bit secret → your k1 address. Change one pixel and you get a different wallet.

Try it: kairoschain.org/wallet

$KAI`],
  ['kairos-g04-livestate.png', `Most chains keep every transaction ever made, forever.

Kairos keeps only what's alive. Spent outputs free their slot, so a chain that's 10 years old asks no more of a new node than one that's 10 days old.

$KAI`],
  ['kairos-g05-vs-l1s.png', `How Kairos stacks up against Bitcoin, Ethereum, Solana and Mina:

✓ one proof verifies the whole chain
✓ hash-based, no elliptic curves
✓ no public keys on chain
✓ no trusted setup
✓ proof of work

$KAI`],
  ['kairos-g06-roadmap.png', `Live today: web testnet, browser mining, Photo Key wallet, explorer, playground.

Next: the node testnet, every block recursively proven.

Then: the road to genesis.

kairoschain.org/roadmap

$KAI`],
  ['kairos-g07-emissions.png', `Kairos emissions:

16 KAI per block, stepping down every year to a permanent 1 KAI tail.

0% to developers. 100% of every block reward to the miner who proves it. State-growth fees are burned.

$KAI`],
  ['kairos-g08-quantum.png', `Built for the day after Q-day.

No elliptic curves. No pairings. No trusted setup. No public keys.

Every Kairos proof is hash-based, assessed at NIST post-quantum Category 1 (conditional).

$KAI`],
  ['kairos-g09-contracts.png', `Money that keeps its word.

Vaults, allowances, budgets, recurring payments, refunds and vesting, all proved inside the block proof.

Break them yourself: kairoschain.org/playground

$KAI`],
  ['kairos-g10-live-today.png', `Not a promise. Live today:

✓ web testnet
✓ mine from a browser
✓ Photo Key wallet + faucet
✓ explorer
✓ contract playground
✓ open-source node
✓ whitepaper

kairoschain.org

$KAI`],
];
let md = '# Kairos content haul: 5 videos, 10 graphics, 15 tweets\n\nAll files are in brand/. Every tweet is ≤245 characters.\n', bad = 0;
T.forEach(([f, t], i) => { const n = [...t].length; if (n > 245) bad++; console.log(String(i + 1).padStart(2), n, f); md += `\n## ${i + 1}. ${f}\n\`\`\`\n${t}\n\`\`\`\n`; });
fs.writeFileSync(path.join(__dirname, '..', 'brand', 'X-KIT-HAUL.md'), md); if (bad) { console.log('OVER LIMIT:', bad); process.exit(1); }
