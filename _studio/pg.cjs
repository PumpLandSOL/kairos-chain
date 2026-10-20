const { open, sleep } = require('./cdp.cjs');
(async () => { const c = await open('about:blank', 1440, 1000, 9877); await c.send('Page.navigate', { url: 'http://localhost:8262/playground' }); await sleep(3500);
  console.log('err?', await c.ev("typeof KairosVM+' '+document.querySelectorAll('#prog div').length"));
  await c.ev("document.getElementById('h').value=100;document.getElementById('pay').value=50;document.getElementById('who').value='payee';call();1"); await sleep(300);
  console.log(await c.ev("document.getElementById('res').innerText"));
  await c.ev("document.getElementById('h').value=103;call();1"); await sleep(300); console.log(await c.ev("document.getElementById('res').innerText"));
  await c.ev("scrollTo(0,330)"); await sleep(500); await c.shot(process.argv[2]); c.close(); })();
