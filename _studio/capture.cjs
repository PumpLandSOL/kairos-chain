// real captures of the running site for the demo videos → _studio/shots/*.png  (needs the site on :8262 with the web testnet)
const fs = require('fs'), path = require('path'); const { open, sleep } = require('./cdp.cjs');
const B = 'http://localhost:' + (process.env.KP || 8262), OUT = path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const W = 1440, H = 900;
(async () => { const c = await open('about:blank', W, H, 9890); const go = async (p, w = 3500) => { await c.send('Page.navigate', { url: B + p }); await sleep(w); };
  const shot = async (n) => { await c.shot(path.join(OUT, n + '.png')); console.log('shot', n); };
  // ---- wallet ----
  await go('/wallet'); await shot('w1-empty');
  await c.ev(`(async()=>{const cv=document.createElement('canvas');cv.width=480;cv.height=320;const g=cv.getContext('2d');const gr=g.createLinearGradient(0,0,480,320);gr.addColorStop(0,'#ff8a3d');gr.addColorStop(.5,'#3b2a5c');gr.addColorStop(1,'#0b1a33');g.fillStyle=gr;g.fillRect(0,0,480,320);
    g.fillStyle='#ffe2a1';g.beginPath();g.arc(330,120,46,0,7);g.fill();g.fillStyle='#0d0f18';g.beginPath();g.moveTo(0,320);for(let x=0;x<=480;x+=12)g.lineTo(x,230+Math.sin(x/37)*30+Math.cos(x/11)*8);g.lineTo(480,320);g.fill();
    for(let i=0;i<900;i++){g.fillStyle='rgba(255,255,255,'+Math.random()*.06+')';g.fillRect(Math.random()*480,Math.random()*320,1,1)}
    const b=await new Promise(r=>cv.toBlob(r,'image/png'));await handle(new File([b],'sunset.png',{type:'image/png'}));return 1})()`); await sleep(2500);
  await c.ev('scrollTo(0,230)'); await sleep(600); await shot('w2-photo');
  await c.ev("drip();1"); await sleep(1200); await c.ev("document.getElementById('tn').scrollIntoView({block:'center'});1"); await sleep(600); await shot('w3-faucet');
  for (let i = 0; i < 40; i++) { await sleep(3000); await c.ev('scan();1'); await sleep(1200); if ((await c.ev("document.getElementById('tnb').textContent")) !== '0') break; }
  await c.ev("document.getElementById('tn').scrollIntoView({block:'center'});1"); await sleep(500); await shot('w4-balance');
  await c.ev("document.getElementById('sto').value=KairosKeys.address(KairosKeys.randomMaster(),0);document.getElementById('samt').value='5';sendTx();1"); await sleep(2500); await shot('w5-sent');
  // ---- mining ----
  const minerAddr = await c.ev("KairosKeys.address(KairosKeys.randomMaster(),0)");
  await go('/mine#' + minerAddr); await c.ev('scrollTo(0,0)'); await shot('m1-ready');
  await c.ev("document.querySelector('#th button[data-n=\"3\"]')&&document.querySelector('#th button[data-n=\"3\"]').click();document.getElementById('go').click();1"); await sleep(6000); await c.ev('scrollTo(0,330)'); await sleep(500); await shot('m2-mining');
  for (let i = 0; i < 60; i++) { await sleep(4000); if ((await c.ev("document.getElementById('bf').textContent")) !== '0') break; }
  await sleep(1500); await c.ev('scrollTo(0,330)'); await sleep(400); await shot('m3-found');
  await go('/explorer', 5000); await shot('m4-explorer');
  await c.ev("scrollTo(0,420)"); await sleep(500); await shot('m5-explorer-lb');
  // ---- other pages for the explainer + hype b-roll ----
  await go('/playground'); await c.ev("document.getElementById('h').value=100;document.getElementById('who').value='payee';call();1"); await sleep(600); await c.ev('scrollTo(0,320)'); await sleep(500); await shot('p1-playground');
  await go('/sync'); await c.ev('scrollTo(0,150)'); await sleep(800); await shot('s1-sync');
  await go('/', 4500); await shot('h1-home');
  c.close(); })();
