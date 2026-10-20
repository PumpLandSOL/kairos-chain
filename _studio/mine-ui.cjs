const { open, sleep } = require('./cdp.cjs'); const K = require('../client/kairos-keys.js');
(async () => { const c = await open('about:blank', 1440, 1000, 9879); const a = K.address(K.randomMaster(), 0);
  await c.send('Page.navigate', { url: 'http://localhost:8265/mine#' + a }); await sleep(3000);
  await c.ev("document.getElementById('go').click();1");
  for (let i = 0; i < 40; i++) { await sleep(5000); const bf = await c.ev("document.getElementById('bf').textContent+' '+document.getElementById('hr').textContent+' '+document.getElementById('ht').textContent"); console.log(bf); if (!bf.startsWith('0 ')) break; }
  console.log(await c.ev("document.getElementById('log').innerText.slice(0,300)")); await c.shot(process.argv[2]); c.close(); })();
