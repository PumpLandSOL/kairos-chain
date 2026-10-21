// V11: "A token today. A proven chain next." hype, 24 s → src/v11-path.html
'use strict';
const fs = require('fs'), path = require('path'), SRC = path.join(__dirname, 'src');
const v = fs.readFileSync(path.join(__dirname, 'vids.cjs'), 'utf8'); let MARK, HEAD, LIB, END, page;
eval(v.slice(v.indexOf('const MARK ='), v.indexOf('// ---------- V1')).replace(/^const (MARK|HEAD|LIB|END|page) =/gm, '$1 ='));
const body = `
<div class="c" id="a"><div class="d" style="font-size:150px">A token<br><span class="g">today.</span></div></div>
<div class="c" id="b"><div><div class="k" style="color:#7dffb2">✓ live</div><div class="d" style="font-size:96px;margin-top:16px">$KAIROS on-chain.</div><div class="mu" style="font-size:28px;margin-top:18px">self-custodied, in your own wallet. not a CEX order book.</div></div></div>
<div class="c" id="c"><div><div class="k" style="color:#7dffb2">✓ live · web testnet</div><div class="d" style="font-size:118px;margin-top:16px" id="w"></div></div></div>
<div id="d" style="position:absolute;inset:0;opacity:0"><svg id="rg" viewBox="0 0 1280 720" style="position:absolute;inset:0"></svg><div style="position:absolute;left:90px;top:250px"><div class="k">next · node testnet</div><div class="d" style="font-size:84px;margin-top:16px;line-height:1">Every block.<br><span class="g">Proven.</span></div></div></div>
<div class="c" id="e"><div><div class="k" style="color:#79adff">genesis · mainnet</div><div class="d" style="font-size:104px;margin-top:16px">Holders <span class="g">migrate in.</span></div><div class="mu" style="font-size:28px;margin-top:18px">every coin after that is mined.</div></div></div>
<div class="c" id="f"><div class="d" style="font-size:120px">A proven chain<br><span class="g">next.</span></div></div>${END()}`;
const script = String.raw`
const W=['Mine.','Send.','Launch.','Verify.'];
window.__seek=(t)=>{bg(t,t>2?1:.3,t*.8);
 $('a').style.opacity=win(t,.2,2.8);$('a').firstChild.style.transform='scale('+(1.15-.15*e((t-.2)/.6))+')';
 $('b').style.opacity=win(t,2.8,6.2);$('b').firstChild.style.transform='translateY('+((1-e((t-2.8)/.5))*30)+'px)';
 $('c').style.opacity=win(t,6.2,10.4,.2);const k=Math.max(0,Math.min(3,Math.floor((t-6.2)/1)));$('w').innerHTML=t>6.2?W.slice(0,k+1).map((x,i)=>'<span class="'+(i===k?'g':'')+'" style="opacity:'+(i===k?1:.3)+'">'+x+' </span>').join(''):'';
 $('d').style.opacity=win(t,10.4,15.2);let o='';const n=Math.min(11,Math.max(1,Math.floor((t-10.4)*2.6)+1));for(let i=0;i<n;i++){const r=26+i*26,last=i===n-1;o+='<circle cx="900" cy="370" r="'+r+'" fill="none" stroke="'+(last?'#ffc35a':'rgba(244,241,234,'+(.1+i*.04)+')')+'" stroke-width="'+(last?3:1.2)+'" '+(i%2&&!last?'stroke-dasharray="2 6"':'')+'/>';}
 const R=26+(n-1)*26,a=t*1.6;o+='<line x1="900" y1="370" x2="'+(900+R*Math.cos(a))+'" y2="'+(370+R*Math.sin(a))+'" stroke="#ffc35a" stroke-width="2.6"/><circle cx="900" cy="370" r="7" fill="#f4f1ea"/>';$('rg').innerHTML=o;
 $('e').style.opacity=win(t,15.2,18.6);$('f').style.opacity=win(t,18.6,21.2);$('f').firstChild.style.transform='scale('+(1.15-.15*e((t-18.6)/.5))+')';
 $('end').style.opacity=e((t-21.2)/.6);};`;
fs.writeFileSync(path.join(SRC, 'v11-path.html'), page(body, script)); console.log('v11 written');
