const { open, sleep } = require('./cdp.cjs'), M = require('fs').readFileSync('shots/names-master.txt', 'utf8');
(async () => { const c = await open('about:blank', 1440, 900, 9891); await c.send('Page.navigate', { url: 'http://localhost:8268/names' }); await sleep(1500);
  await c.ev(`localStorage.setItem('kai_master','${M}');location.reload();1`); await sleep(5000); await c.shot('shots/names-hero.png');
  await c.ev("$('q').value='genesis';search();1"); await sleep(1200); await c.ev('scrollTo(0,150)'); await sleep(300); await c.shot('shots/names-avail.png');
  await c.ev("$('q').value='vitalik';search();1"); await sleep(1200); await c.ev('scrollTo(0,150)'); await sleep(300); await c.shot('shots/names-taken.png');
  await c.send('Page.navigate', { url: 'http://localhost:8268/wallet' }); await sleep(5000); await c.ev("$('sto').value='vitalik.kairos';$('samt').value='10';$('sto').scrollIntoView({block:'center'});1"); await sleep(600); await c.shot('shots/names-wallet.png');
  c.close(); process.exit(0); })();
