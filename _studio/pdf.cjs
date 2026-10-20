// whitepaper → client/kairos-whitepaper.pdf (print CSS hides site chrome)
const fs = require('fs'), path = require('path'); const { open, sleep } = require('./cdp.cjs');
(async () => { const c = await open('about:blank', 1200, 1600, 9881); await c.send('Page.navigate', { url: 'http://localhost:' + (process.env.KP || 8263) + '/whitepaper' }); await sleep(3500);
  await c.ev('document.fonts.ready.then(()=>1)'); const r = await c.send('Page.printToPDF', { printBackground: true, paperWidth: 8.27, paperHeight: 11.69, preferCSSPageSize: true,
    displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: '<div style="width:100%;font-size:8px;font-family:monospace;color:#857b6a;text-align:center">Kairos Chain whitepaper v1.0 · <span class="pageNumber"></span> / <span class="totalPages"></span></div>' });
  fs.writeFileSync(path.join(__dirname, '..', 'client', 'kairos-whitepaper.pdf'), Buffer.from(r.data, 'base64')); c.close(); console.log('pdf ok'); })();
