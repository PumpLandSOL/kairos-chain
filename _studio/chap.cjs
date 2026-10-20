// node chap.cjs out_dir id1 id2 ... : screenshot chapters of the landing page
const { open, sleep } = require('./cdp.cjs'); const [, , DIR, ...ids] = process.argv;
(async () => { const c = await open('about:blank', 1440, 900, 9820 + Math.floor(Math.random() * 50)); await c.send('Page.navigate', { url: 'http://localhost:' + (process.env.KP || 8263) + '/' }); await sleep(3500);
  const err = await c.ev('window.__err||""'); if (err) console.log('ERR', err);
  for (const id of ids) { await c.ev(`document.getElementById('${id}').scrollIntoView();1`); await sleep(2400); await c.shot(`${DIR}/c-${id}.jpg`, 'jpeg'); }
  c.close(); })();
