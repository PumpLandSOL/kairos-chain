const { open, sleep } = require('./cdp.cjs'); const [, , URL, DIR] = process.argv;
(async () => { const c = await open('about:blank', 1440, 900, 9813); await c.send('Page.navigate', { url: URL }); await sleep(7000);
  for (let i = 1; i < 18; i++) { await c.ev("document.getElementById('next').click();1"); await sleep(3200); await c.shot(`${DIR}/s${String(i).padStart(2, '0')}.jpg`, 'jpeg'); }
  c.close(); })();
