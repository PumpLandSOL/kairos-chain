const { open, sleep } = require('./cdp.cjs'), M = require('fs').readFileSync('shots/season-master.txt', 'utf8');
(async () => { const c = await open('about:blank', 1440, 900, 9892); await c.send('Page.navigate', { url: 'http://localhost:8268/season' }); await sleep(1500);
  await c.ev(`localStorage.setItem('kai_master','${M}');location.reload();1`); await sleep(6000); await c.shot('shots/season-top.png');
  await c.ev('scrollTo(0,430)'); await sleep(500); await c.shot('shots/season-board.png'); c.close(); process.exit(0); })();
