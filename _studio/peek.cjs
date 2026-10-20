// node peek.cjs <path> <out.png> [width] [height] [scrollY] : headless screenshot of the local site
const { open, sleep } = require('./cdp.cjs'); const [, , P = '/', OUT = 'peek.png', W = 1440, H = 900, Y = 0] = process.argv;
(async () => { const c = await open('http://localhost:' + (process.env.KP || 8263) + P, +W, +H, 9870 + Math.floor(Math.random() * 100)); await c.send('Page.navigate', { url: 'http://localhost:' + (process.env.KP || 8263) + P }); await sleep(3000);
  await c.ev(`document.querySelectorAll('.reveal').forEach(e=>e.classList.add('in'));scrollTo(0,${Y});1`); await sleep(900); await c.shot(OUT); c.close(); })();
