// KAIROS STATION: a small multiplayer world on the web testnet. Presence, movement and chat live in memory and
// stream to every client over Server-Sent Events; payments between players are ordinary testnet transactions.
'use strict';
const W = 1600, H = 1000, players = new Map(), subs = new Set(), chat = [];
const clean = (s, n) => String(s || '').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, n);
const COLORS = ['#ffc35a', '#79adff', '#7dffb2', '#ff8a3d', '#ff5d4f', '#c58bff', '#f4f1ea'];
let seq = 0;
function snapshot() { return [...players.values()].map((p) => ({ id: p.id, name: p.name, color: p.color, x: p.x, y: p.y, addr: p.addr, emote: p.emote && Date.now() - p.emoteAt < 4000 ? p.emote : null })); }
function broadcast(ev, data) { const msg = `event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`; for (const r of subs) { try { r.write(msg); } catch {} } }
setInterval(() => { const now = Date.now(); for (const [id, p] of players) if (now - p.seen > 20000) { players.delete(id); broadcast('leave', { id }); } broadcast('state', snapshot()); }, 200);
function say(p, text, kind = 'chat') { const m = { id: ++seq, at: Date.now(), from: p ? p.name : 'STATION', color: p ? p.color : '#ffc35a', text, kind }; chat.push(m); if (chat.length > 80) chat.shift(); broadcast('chat', m); }
module.exports = async function route(p, req, res, u, send, body) {
  if (!p.startsWith('/api/world/')) return false;
  if (p === '/api/world/stream') { res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive', 'x-accel-buffering': 'no' }); res.write(`event: hello\ndata: ${JSON.stringify({ w: W, h: H, players: snapshot(), chat: chat.slice(-30) })}\n\n`); subs.add(res); req.on('close', () => subs.delete(res)); return true; }
  if (req.method !== 'POST') return send(404, { error: 'unknown' }), true;
  const b = await body().catch(() => ({}));
  if (p === '/api/world/join') { const id = Math.random().toString(36).slice(2, 10), name = clean(b.name, 16) || 'crew-' + id.slice(0, 4);
    const pl = { id, name, color: COLORS.includes(b.color) ? b.color : COLORS[players.size % COLORS.length], x: 760 + Math.random() * 80, y: 520 + Math.random() * 60, addr: /^k1[02-9ac-hj-np-z]{20,90}$/.test(b.addr || '') ? b.addr : null, seen: Date.now() };
    players.set(id, pl); say(null, `${name} boarded the station`, 'sys'); return send(200, { id, w: W, h: H }), true; }
  const pl = players.get(String(b.id || '')); if (!pl) return send(404, { error: 'not on board' }), true; pl.seen = Date.now();
  if (p === '/api/world/move') { pl.x = Math.max(20, Math.min(W - 20, +b.x || pl.x)); pl.y = Math.max(20, Math.min(H - 20, +b.y || pl.y)); if (/^k1/.test(b.addr || '')) pl.addr = b.addr; return send(200, { ok: 1 }), true; }
  if (p === '/api/world/chat') { const t = clean(b.text, 200); if (!t) return send(400, { error: 'empty' }), true; if (Date.now() - (pl.lastChat || 0) < 700) return send(429, { error: 'slow down' }), true; pl.lastChat = Date.now(); pl.emote = t.slice(0, 40); pl.emoteAt = Date.now(); say(pl, t); return send(200, { ok: 1 }), true; }
  if (p === '/api/world/paid') { const to = players.get(String(b.to || '')); say(null, `${pl.name} sent ${clean(b.amount, 16)} test KAIROS to ${to ? to.name : 'a crew member'} · tx ${clean(b.txid, 12)}…`, 'pay'); return send(200, { ok: 1 }), true; }
  if (p === '/api/world/event') { say(null, `${pl.name} ${clean(b.text, 80)}`, 'sys'); return send(200, { ok: 1 }), true; }
  return send(404, { error: 'unknown' }), true;
};
