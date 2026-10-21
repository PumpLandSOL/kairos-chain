const { open, sleep } = require('./cdp.cjs');
(async () => { const c = await open('about:blank', 1440, 900, 9890); await c.send('Page.navigate', { url: 'http://localhost:8268/nft' }); await sleep(4000);
  await c.ev('scrollTo(0,200)'); await sleep(500); await c.shot('shots/nft-market.png');
  await c.ev("setTab('create');1"); await sleep(800); await c.ev("$('nn').value='Orbit #10';PAL=1;vCreate();$('nn').value='Orbit #10';1"); await sleep(600); await c.ev('scrollTo(0,200)'); await sleep(300); await c.shot('shots/nft-create.png');
  await c.ev("setTab('all');1"); await sleep(1200); await c.ev('scrollTo(0,200)'); await sleep(400); await c.shot('shots/nft-all.png'); c.close(); process.exit(0); })();
