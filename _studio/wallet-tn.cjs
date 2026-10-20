const { open, sleep } = require('./cdp.cjs');
(async () => { const c = await open('about:blank', 1440, 1100, 9880); await c.send('Page.navigate', { url: 'http://localhost:8265/wallet' }); await sleep(3000);
  await c.ev("rnd();1"); await sleep(2500); await c.ev("drip();1"); await sleep(1500); console.log('drip:', await c.ev("document.getElementById('tnm').textContent"));
  for (let i = 0; i < 40; i++) { await sleep(4000); await c.ev("scan();1"); await sleep(1500); const b = await c.ev("document.getElementById('tnb').textContent"); if (b !== '0') { console.log('balance', b); break; } }
  await c.ev("document.getElementById('sto').value=KairosKeys.address(KairosKeys.randomMaster(),0);document.getElementById('samt').value='3.5';sendTx();1"); await sleep(2500);
  console.log('send:', await c.ev("document.getElementById('tnm').textContent"));
  for (let i = 0; i < 30; i++) { await sleep(4000); await c.ev("scan();1"); await sleep(1500); const t = await c.ev("document.getElementById('tna').innerText"); if (/retired/.test(t)) { console.log(t); break; } }
  console.log('balance after', await c.ev("document.getElementById('tnb').textContent")); await c.ev("document.getElementById('tn').scrollIntoView();1"); await sleep(400); await c.shot(process.argv[2]); c.close(); })();
