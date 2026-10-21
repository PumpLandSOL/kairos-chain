// V10: Phase 2 teaser, 22 s → src/v10-phase2.html
'use strict';
const fs = require('fs'), path = require('path'), SRC = path.join(__dirname, 'src');
const v = fs.readFileSync(path.join(__dirname, 'vids.cjs'), 'utf8'); let MARK, HEAD, LIB, END, page;
eval(v.slice(v.indexOf('const MARK ='), v.indexOf('// ---------- V1')).replace(/^const (MARK|HEAD|LIB|END|page) =/gm, '$1 ='));
const body = `
<div class="c" id="a"><div><div class="k" style="color:#7dffb2">phase 1 · complete</div><div id="l1" style="margin-top:26px;text-align:left;display:inline-block"></div></div></div>
<div class="c" id="b"><div><div class="k">phase 2 · underway</div><div class="d" style="font-size:118px;margin-top:18px">Every block.<br><span class="g">Proven.</span></div></div></div>
<div id="c" style="position:absolute;inset:0;opacity:0"><svg id="rg" viewBox="0 0 1280 720" style="position:absolute;inset:0"></svg>
 <div style="position:absolute;left:90px;top:200px;width:520px"><div class="k">the node testnet</div><div class="d" style="font-size:54px;margin-top:14px;line-height:1.02">The real Kairos node,<br><span class="g">running in public.</span></div>
 <div id="pts" style="margin-top:26px"></div></div></div>
<div class="c" id="d"><div><div class="d" style="font-size:96px">Phase 2.<br><span class="g">Coming next.</span></div><div class="m mu" style="font-size:20px;margin-top:24px;letter-spacing:.12em">node testnet · recursive proofs · downloads</div></div></div>${END()}`;
const script = String.raw`
const L1=['web testnet','browser mining','Photo Key wallet','launchpad + pools','explorer + verifier','open-source node'];
const PT=['every block carries a recursive proof','one ≈1 MB proof verifies the whole chain','node, miner and wallet downloads','seed nodes and a miner leaderboard'];
window.__seek=(t)=>{bg(t,.5,t*.6);$('a').style.opacity=win(t,.2,4.6);$('b').style.opacity=win(t,4.6,7.8);$('b').firstChild.style.transform='scale('+(1.2-.2*e((t-4.6)/.5))+')';$('c').style.opacity=win(t,7.8,16.4);$('d').style.opacity=win(t,16.4,19.4);$('end').style.opacity=e((t-19.4)/.6);
 $('l1').innerHTML=L1.map((x,i)=>{const p=e((t-.6-i*.45)/.4);return '<div style="opacity:'+p+';font-size:40px;font-weight:700;letter-spacing:-.02em;margin:8px 0"><span style="color:#7dffb2;margin-right:16px">✓</span>'+x+'</div>';}).join('');
 $('pts').innerHTML=PT.map((x,i)=>{const p=e((t-8.6-i*.9)/.5);return '<div style="opacity:'+p+';transform:translateX('+((1-p)*-24)+'px);font-size:23px;color:#a3a097;padding:10px 0;border-bottom:1px solid rgba(244,241,234,.08)"><span style="color:#ffc35a;margin-right:12px">○</span>'+x+'</div>';}).join('');
 let o='';const n=Math.min(11,Math.max(1,Math.floor((t-7.8)*1.6)+1));for(let i=0;i<n;i++){const r=26+i*24,last=i===n-1;o+='<circle cx="930" cy="380" r="'+r+'" fill="none" stroke="'+(last?'#ffc35a':'rgba(244,241,234,'+(.1+i*.04)+')')+'" stroke-width="'+(last?3:1.2)+'" '+(i%2&&!last?'stroke-dasharray="2 6"':'')+'/>';}
 const R=26+(n-1)*24,a=t*1.3;o+='<line x1="930" y1="380" x2="'+(930+R*Math.cos(a))+'" y2="'+(380+R*Math.sin(a))+'" stroke="#ffc35a" stroke-width="2.4"/><circle cx="930" cy="380" r="7" fill="#f4f1ea"/><text x="930" y="660" text-anchor="middle" font-family="Geist Mono" font-size="16" letter-spacing="3" fill="#6b6a66">EACH RING A BLOCK · EACH PROOF HOLDS THE LAST</text>';$('rg').innerHTML=o;};`;
fs.writeFileSync(path.join(SRC, 'v10-phase2.html'), page(body, script)); console.log('v10 written');
