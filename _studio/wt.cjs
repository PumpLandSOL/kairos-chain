const { open, sleep } = require('./cdp.cjs');
(async () => { const c = await open('about:blank', 1440, 1000, 9878); await c.send('Page.navigate', { url: 'http://localhost:8262/wallet' }); await sleep(3500);
  console.log(await c.ev("typeof KairosKeys"));
  await c.ev(`(async()=>{const cv=document.createElement('canvas');cv.width=cv.height=64;const g=cv.getContext('2d');for(let i=0;i<4096;i++){g.fillStyle='hsl('+(i*7%360)+',70%,'+(30+i%40)+'%)';g.fillRect(i%64,Math.floor(i/64),1,1)}
    const b=await new Promise(r=>cv.toBlob(r,'image/png'));await handle(new File([b],'test.png',{type:'image/png'}));return 1})()`); await sleep(1500);
  console.log(await c.ev("document.getElementById('a0').textContent+' | '+document.getElementById('kid').textContent+' | '+document.getElementById('dz').innerText"));
  await c.ev("moreAddr();moreAddr();document.getElementById('chk').value=document.getElementById('a0').textContent;document.getElementById('chk').oninput();1"); await sleep(300);
  console.log(await c.ev("document.getElementById('chkr').textContent")); await c.ev('scrollTo(0,200)'); await sleep(400); await c.shot(process.argv[2]); c.close(); })();
