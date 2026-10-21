const { open, sleep } = require('./cdp.cjs');
(async () => { const c = await open('about:blank', 1440, 1000, 9894); await c.send('Page.navigate', { url: 'http://localhost:8267/launchpad' }); await sleep(4000);
  await c.ev("openA((ASSETS.find(a=>a.ticker==='KRON')||ASSETS[0]).id);1"); await sleep(2500); await c.ev("$('amt').value='25';quote();1"); await sleep(400); await c.ev('scrollTo(0,150)'); await sleep(300); await c.shot('shots/lp-trade.png');
  await c.ev("setTab('liquidity');1"); await sleep(2000); await c.ev('scrollTo(0,150)'); await c.shot('shots/lp-liq.png'); c.close(); process.exit(0); })();
