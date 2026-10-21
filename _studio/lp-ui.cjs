// launchpad UI test + screenshots (shots/lp-*.png): node lp-ui.cjs  (local testnet on P=8267, easy target, house miner off)
const { open, sleep } = require('./cdp.cjs'); const K = require('../client/kairos-keys.js'), T = require('../client/tn-core.js'); const B = 'http://localhost:' + (process.env.P || 8267);
const j = async (p, b, n = 0) => { try { return await (await fetch(B + p, b ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) } : {})).json(); } catch (e) { if (n > 4) throw e; await new Promise((r) => setTimeout(r, 500)); return j(p, b, n + 1); } };
async function mine(to) { const tp = await j('/api/tn/template?miner=' + to); const f = T.powFields(tp.header), tgt = T.I.fromHex(tp.header.target); for (let n = 0n; ; n++) { f[10] = T.u128(n); if (T.le256lt(T.powDigestFields(f), tgt)) return j('/api/tn/submit', { id: tp.id, nonce: n.toString(16) }); } }
(async () => { const M = K.randomMaster(), burn = K.address(K.randomMaster(), 0); for (let i = 0; i < 14; i++) await mine(K.address(M, 0));
  let run = true; (async () => { while (run) { await new Promise((r) => setTimeout(r, 2500)); try { await mine(burn); } catch {} } })();
  const c = await open('about:blank', 1440, 1000, 9893); await c.send('Page.navigate', { url: B + '/launchpad' }); await sleep(1500);
  await c.ev(`localStorage.setItem('kai_master','${M}');location.reload();1`); await sleep(5000);
  await c.ev("setTab('create');1"); await sleep(600);
  await c.ev("$('cn').value='Kronos';$('ct').value='KRON';$('cs').value='2000000';$('cb').value='0.00001';$('cc').value='#ff8a3d';$('cd').value='Time, tokenized';$('cs').dispatchEvent(new Event('input'));1"); await sleep(300);
  await c.shot('shots/lp-create.png'); await c.ev("create();1");
  for (let i = 0; i < 30; i++) { await sleep(2000); const m = await c.ev("$('cm').innerText"); if (/✓|✗/.test(m)) { console.log('create:', m); break; } }
  await c.ev("setTab('launchpad');1"); await sleep(1200); await c.shot('shots/lp-launchpad.png');
  const id = await c.ev("ASSETS.find(a=>a.ticker==='KRON').id"); await c.ev(`openA('${id}');1`); await sleep(1500);
  await c.ev("$('amt').value='60';quote();1"); await sleep(300); console.log('quote:', await c.ev("$('est').textContent")); await c.ev("doSwap();1");
  for (let i = 0; i < 30; i++) { await sleep(2000); const m = await c.ev("$('sm').innerText"); if (/✓|✗/.test(m)) { console.log('buy:', m); break; } }
  await sleep(1500); await c.ev("SIDE='sell';render();1"); await sleep(1500); await c.ev("$('amt').value='100000';quote();1"); await c.ev("doSwap();1");
  for (let i = 0; i < 30; i++) { await sleep(2000); const m = await c.ev("$('sm').innerText"); if (/✓|✗/.test(m)) { console.log('sell:', m); break; } }
  await sleep(1500); await c.ev("SIDE='buy';render();1"); await sleep(1800); await c.ev("$('amt').value='25';quote();1"); await sleep(300); await c.shot('shots/lp-trade.png');
  await c.ev("setTab('mine');1"); await sleep(1200); await c.shot('shots/lp-mine.png'); console.log('mine:', (await c.ev("$('view').innerText")).slice(0, 120));
  run = false; c.close(); process.exit(0); })();
