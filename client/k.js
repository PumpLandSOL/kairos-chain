// shared chrome for every Kairos Chain page (dark theme)
const KAI = { ca: '', x: '', domain: 'kairoschain.xyz', fork: 'https://github.com/proof-native/parano1d' }; // set ca + x once live
const MARK = '<svg viewBox="0 0 40 40" fill="none"><defs><linearGradient id="kg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe2a1"/><stop offset=".5" stop-color="#ffc35a"/><stop offset="1" stop-color="#ff8a3d"/></linearGradient></defs><circle cx="20" cy="20" r="17" stroke="#f4f1ea" stroke-opacity=".9" stroke-width="1.6"/><circle cx="20" cy="20" r="10.5" stroke="#f4f1ea" stroke-opacity=".35" stroke-width="1.2" stroke-dasharray="1.6 2.4"/><path d="M20 20 31 9" stroke="url(#kg)" stroke-width="2.4" stroke-linecap="round"/><circle cx="31" cy="9" r="3.4" fill="url(#kg)"/><circle cx="20" cy="20" r="2.6" fill="#f4f1ea"/></svg>';
function chrome(active, opts = {}) {
  const b = document.createElement('header'); b.className = 'bar';
  b.innerHTML = `<a class="logo" href="/">${MARK}Kairos</a><nav id="nv">${[['/', 'Chain'], ['/docs', 'Docs'], ['/whitepaper', 'Whitepaper'], ['/roadmap', 'Roadmap'], ['/brand', 'Brand']].map(([h, l]) => `<a href="${h}" class="${active === h ? 'on' : ''}">${l}</a>`).join('')}</nav><div class="sp"></div>
   ${KAI.x ? `<a class="x hide-m" href="${KAI.x}" target="_blank" rel="noopener" aria-label="X"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18.9 2H22l-6.8 7.8L23 22h-6.2l-4.9-6.4L6.3 22H3.2l7.3-8.3L1 2h6.4l4.4 5.8L18.9 2Zm-1.1 18h1.7L6.3 3.9H4.5L17.8 20Z"/></svg></a>` : ''}
   <a class="btn hide-m" href="/whitepaper">Whitepaper</a><a class="btn pri" href="${KAI.ca ? 'https://pump.fun/coin/' + KAI.ca : '/#kai'}" ${KAI.ca ? 'target="_blank" rel="noopener"' : ''}>$KAI</a><button class="burger" aria-label="menu" onclick="document.getElementById('nv').classList.toggle('open')">≡</button>`;
  document.body.prepend(b);
  if (opts.noFoot) return;
  const f = document.createElement('footer'); f.className = 'foot';
  f.innerHTML = `<div class="in"><div><a class="logo" href="/">${MARK}Kairos Chain</a><p style="margin-top:14px;max-width:360px">A proof-native Layer 1. Every block carries one recursive proof of the entire chain. The present proves the past.</p>
    <p class="mono" style="font-size:12px;margin-top:16px;color:var(--dim)">$KAI CA: ${KAI.ca ? `<span style="cursor:pointer;color:var(--fg)" onclick="copy('${KAI.ca}')">${KAI.ca}</span>` : 'published at launch'}</p></div>
   ${[['Learn', [['The chain', '/'], ['Docs', '/docs'], ['Whitepaper', '/whitepaper'], ['Roadmap', '/roadmap']]], ['Protocol', [['Consensus', '/docs#consensus'], ['Proof stack', '/docs#proofs'], ['Ownership', '/docs#ownership'], ['Economics', '/docs#economics']]], ['Project', [['$KAI + migration', '/docs#migration'], ['Brand kit', '/brand'], ['Open source', '/docs#source'], ['Whitepaper PDF', '/kairos-whitepaper.pdf']]]].map(([h, ls]) => `<div><h5>${h}</h5>${ls.map(([t, u]) => `<a href="${u}">${t}</a>`).join('')}</div>`).join('')}</div>
   <div class="bt"><span>© ${new Date().getFullYear()} Kairos Chain contributors · Apache-2.0</span><span>Kairos Chain is an independent fork of the open-source <a href="${KAI.fork}" target="_blank" rel="noopener" style="text-decoration:underline">Parano1d</a> protocol. Not affiliated with Parano1d or NOID.</span></div>`;
  document.body.append(f);
}
const $ = (i) => document.getElementById(i);
function toast(m) { let t = document.querySelector('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.append(t); } t.textContent = m; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 2200); }
function copy(v) { navigator.clipboard.writeText(v).then(() => toast('Copied')); }
