// screenshots of a reference site at several scroll depths + its page structure
const fs = require('fs'); const { open, sleep } = require('./cdp.cjs'); const [, , URL, DIR] = process.argv;
(async () => { const c = await open('about:blank', 1440, 900, 9811); await c.send('Page.navigate', { url: URL }); await sleep(7000);
  const H = await c.ev('document.documentElement.scrollHeight'); console.log('height', H);
  for (let y = 0, i = 0; y < H && i < 16; y += 880, i++) { await c.ev(`scrollTo(0,${y});1`); await sleep(1600); await c.shot(`${DIR}/ref${String(i).padStart(2, '0')}.jpg`, 'jpeg'); }
  fs.writeFileSync(DIR + '/ref.txt', await c.ev(`[...document.querySelectorAll('section,header,h1,h2,h3')].map(e=>e.tagName+' '+(e.id||'')+' :: '+(e.innerText||'').slice(0,140).replace(/\n/g,' | ')).join('\n')`));
  fs.writeFileSync(DIR + '/ref.css.txt', await c.ev(`[...document.styleSheets].map(s=>{try{return [...s.cssRules].map(r=>r.cssText).join('\n')}catch(e){return ''}}).join('\n').slice(0,60000)`));
  fs.writeFileSync(DIR + '/ref.fonts.txt', await c.ev(`JSON.stringify({fonts:[...document.fonts].map(f=>f.family+' '+f.weight),body:getComputedStyle(document.body).backgroundColor,color:getComputedStyle(document.body).color,canvas:document.querySelectorAll('canvas').length,svg:document.querySelectorAll('svg').length,scripts:[...document.scripts].map(s=>s.src).filter(Boolean)})`));
  c.close(); })();
