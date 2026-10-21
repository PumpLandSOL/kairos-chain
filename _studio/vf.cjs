const { open, sleep } = require('./cdp.cjs');
(async () => { const c = await open('about:blank', 1440, 1000, 9895); await c.send('Page.navigate', { url: 'http://localhost:' + (process.env.P || 8267) + '/verify' }); await sleep(3000);
  await c.ev("document.getElementById('go').click();1"); for (let i = 0; i < 60; i++) { await sleep(1000); const r = await c.ev("document.getElementById('res').innerText"); if (r) { console.log(r); break; } }
  await c.ev('scrollTo(0,200)'); await sleep(500); await c.shot(process.argv[2]); c.close(); process.exit(0); })();
