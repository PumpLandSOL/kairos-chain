const { open, sleep } = require('./cdp.cjs');
(async () => { const c = await open('about:blank', 1440, 900, 9897); await c.send('Page.navigate', { url: 'http://localhost:8267/verify' }); await sleep(3000);
  await c.ev('scrollTo(0,0)'); await sleep(300); await c.shot('shots/vf-start.png'); await c.ev("document.getElementById('go').click();1");
  for (let i = 0; i < 60; i++) { await sleep(700); if (await c.ev("document.getElementById('res').innerText")) break; } await sleep(800); await c.ev('scrollTo(0,230)'); await sleep(400); await c.shot('shots/vf-done.png');
  await c.send('Page.navigate', { url: 'http://localhost:8267/explorer' }); await sleep(3500); await c.shot('shots/vf-explorer.png'); c.close(); process.exit(0); })();
