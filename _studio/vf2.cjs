const { open, sleep } = require('./cdp.cjs');
(async () => { const c = await open('about:blank', 1200, 800, 9896); await c.send('Page.navigate', { url: 'http://localhost:8267/verify' }); await sleep(2500);
  console.log(await c.ev(`new Promise(ok=>{const w=new Worker('/tn-verify.js');w.onerror=(e)=>ok('ERR '+e.message);w.onmessage=(e)=>ok('OK '+e.data.out.length);fetch('/api/tn/headers?from=0&to=5').then(r=>r.json()).then(b=>w.postMessage({headers:b.headers,genTarget:b.genTarget,prev:null,gen:null}));setTimeout(()=>ok('timeout'),8000)})`));
  console.log(await c.ev(`fetch('/tn-verify.js').then(r=>r.status+' '+r.headers.get('content-type'))`)); c.close(); process.exit(0); })();
