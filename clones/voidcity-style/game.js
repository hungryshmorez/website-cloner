(() => {
'use strict';
const T = 16, MW = 60, MH = 44, SCALE = 3, SPEED = 70;
const cv = document.getElementById('game'), ctx = cv.getContext('2d');
const $ = id => document.getElementById(id);
const store = { get(k){ try { return localStorage.getItem(k); } catch { return null; } }, set(k,v){ try { localStorage.setItem(k,v); } catch { /* unavailable */ } } };

/* ---------- world (built in code) ---------- */
// tile ids: 0 grass, 1 path, 2 wall, 3 club floor, 4 dance floor, 5 tent floor, 6 apt floor, 7 water, 8 door
const map = Array.from({ length: MH }, () => Array(MW).fill(0));
const rect = (x, y, w, h, t) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) map[j][i] = t; };
const building = (x, y, w, h, floor, doorX) => { rect(x, y, w, h, 2); rect(x + 1, y + 1, w - 2, h - 2, floor); map[y + h - 1][doorX] = 8; map[y + h - 1][doorX + 1] = 8; };
rect(0, 0, MW, 3, 7);                       // river at the top
rect(4, 20, 52, 3, 1); rect(28, 14, 3, 30, 1); // main roads
building(18, 4, 24, 11, 3, 29);              // club
rect(24, 6, 12, 6, 4);                       // dance floor
building(46, 24, 11, 9, 6, 50);              // apartments
rect(50, 22, 2, 2, 1);
for (let i = 0; i < 6; i++) { const x = 4 + (i % 3) * 7, y = 26 + Math.floor(i / 3) * 7; rect(x, y, 5, 4, 5); rect(x + 2, y + 4, 1, 3, 1); rect(x + 2, y + 3, 1, 1, 8); }
const ZONES = [[18, 4, 24, 11, 'ENTER THE CLUB'], [46, 24, 11, 9, 'Apartments'], [2, 24, 22, 16, 'Tent City'], [0, 0, MW, 3, 'The River']];
const solid = t => t === 2 || t === 7;

/* ---------- props ---------- */
const trees = []; let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
for (let i = 0; i < 90; i++) { const x = Math.floor(rnd() * MW), y = 3 + Math.floor(rnd() * (MH - 3)); if (map[y][x] === 0 && !ZONES.slice(0, 3).some(([a, b, w, h]) => x >= a - 1 && x < a + w + 1 && y >= b - 1 && y < b + h + 1)) trees.push([x, y]); }
trees.forEach(([x, y]) => { map[y][x] = 9; }); // 9 = tree, solid
const isSolid = t => solid(t) || t === 9;
const blockedAt = (x, y) => { const tx = Math.floor(x / T), ty = Math.floor(y / T); return tx < 0 || ty < 0 || tx >= MW || ty >= MH || isSolid(map[ty][tx]); };

/* ---------- entities ---------- */
const COLORS = ['#fd9978', '#fec837', '#749593', '#a78bfa', '#f472b6', '#60a5fa'];
const me = { name: 'you', x: 29 * T, y: 21 * T, color: COLORS[0], dir: 0, step: 0, target: null, say: '', sayT: 0 };
const NPC_LINES = ['this bass tho', 'anyone seen the DJ?', 'gg', 'tent life > apartment life', 'is it friday yet', 'wooo', 'brb snacks', 'nice moves', 'the river looks weird tonight', 'one more song'];
const npcs = ['Mo', 'Juno', 'kiwi', 'Bex', 'Tao', 'Ziggy', 'nova', 'Pip'].map((name, i) => ({ name, x: (24 + i * 2) * T, y: (17 + (i % 3) * 2) * T, color: COLORS[i % COLORS.length], dir: 0, step: 0, target: null, say: '', sayT: 0, wait: rnd() * 3 }));
const people = [me, ...npcs];

/* ---------- audio: tiny generative beat, louder in the club ---------- */
let actx, master, muted = false, beatStep = 0, beatTimer = 0;
function startAudio() { if (actx) return; const C = window.AudioContext || window.webkitAudioContext; if (!C) return; actx = new C(); master = actx.createGain(); master.gain.value = 0; master.connect(actx.destination); }
function tone(f, d, type, v) { if (!actx) return; const o = actx.createOscillator(), g = actx.createGain(); o.type = type; o.frequency.value = f; g.gain.value = v; g.gain.exponentialRampToValueAtTime(.0001, actx.currentTime + d); o.connect(g).connect(master); o.start(); o.stop(actx.currentTime + d); }
function music(dt) {
  if (!actx || muted) return; beatTimer += dt; if (beatTimer < .25) return; beatTimer = 0; beatStep = (beatStep + 1) % 16;
  const bass = [55, 55, 65, 55, 73, 73, 65, 55];
  if (beatStep % 4 === 0) tone(50, .18, 'sine', .9);
  if (beatStep % 2 === 1) tone(bass[(beatStep >> 1) % 8] * 2, .12, 'square', .18);
  if (beatStep % 4 === 2) tone(4000, .03, 'square', .06);
}
const inClub = () => { const tx = me.x / T, ty = me.y / T; return tx > 18 && tx < 42 && ty > 4 && ty < 15; };

/* ---------- input ---------- */
const keys = new Set(); let chatting = false;
addEventListener('keydown', e => {
  if (!started) return;
  if (chatting) { if (e.key === 'Escape') closeChat(); return; }
  if (e.key === 'Enter') { e.preventDefault(); openChat(); return; }
  keys.add(e.key.toLowerCase()); me.target = null;
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
cv.addEventListener('pointerdown', e => { if (!started) return; startAudio(); const r = cv.getBoundingClientRect(); me.target = { x: (e.clientX - r.left) / SCALE_R() + cam.x, y: (e.clientY - r.top) / SCALE_R() + cam.y }; });
function openChat() { chatting = true; $('chatForm').hidden = false; $('chatInput').focus(); }
function closeChat() { chatting = false; $('chatForm').hidden = true; $('chatInput').blur(); }
$('chatForm').onsubmit = e => { e.preventDefault(); const v = $('chatInput').value.trim(); $('chatInput').value = ''; closeChat(); if (v) speak(me, v); };
$('mute').onclick = e => { muted = !muted; e.currentTarget.setAttribute('aria-pressed', muted); };

function speak(p, text) {
  p.say = text; p.sayT = 5;
  const li = document.createElement('li'), b = document.createElement('b');
  b.textContent = p.name + ': '; li.append(b, document.createTextNode(text)); $('log').append(li);
  while ($('log').children.length > 6) $('log').firstChild.remove();
  setTimeout(() => li.remove(), 15000);
}

/* ---------- update ---------- */
const cam = { x: 0, y: 0 };
const SCALE_R = () => Math.max(2, Math.round(Math.min(innerWidth / 320, innerHeight / 200))) ;
function move(p, dx, dy, dt) {
  if (!dx && !dy) { p.step = 0; return; }
  const len = Math.hypot(dx, dy); dx = dx / len * SPEED * dt; dy = dy / len * SPEED * dt;
  if (!blockedAt(p.x + dx, p.y + 4)) p.x += dx;
  if (!blockedAt(p.x, p.y + dy + 4)) p.y += dy;
  p.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 3 : 2) : (dy > 0 ? 0 : 1);
  p.step += dt * 8;
}
function update(dt) {
  let dx = (keys.has('d') || keys.has('arrowright')) - (keys.has('a') || keys.has('arrowleft'));
  let dy = (keys.has('s') || keys.has('arrowdown')) - (keys.has('w') || keys.has('arrowup'));
  if (me.target && !dx && !dy) { const tx = me.target.x - me.x, ty = me.target.y - me.y; if (Math.hypot(tx, ty) < 3) me.target = null; else { dx = tx; dy = ty; } }
  move(me, dx, dy, dt);
  npcs.forEach(n => {
    n.wait -= dt;
    if (n.wait <= 0 && !n.target) { n.target = { x: n.x + (rnd() - .5) * 160, y: n.y + (rnd() - .5) * 120 }; n.wait = 2 + rnd() * 5; if (rnd() < .3) speak(n, NPC_LINES[Math.floor(rnd() * NPC_LINES.length)]); }
    if (n.target) { const tx = n.target.x - n.x, ty = n.target.y - n.y; if (Math.hypot(tx, ty) < 3) n.target = null; else { const ox = n.x, oy = n.y; move(n, tx, ty, dt); if (ox === n.x && oy === n.y) n.target = null; } } else n.step = 0;
  });
  people.forEach(p => { p.sayT = Math.max(0, p.sayT - dt); });
  const s = SCALE_R(); cam.x = Math.max(0, Math.min(MW * T - cv.width / s, me.x - cv.width / s / 2)); cam.y = Math.max(0, Math.min(MH * T - cv.height / s, me.y - cv.height / s / 2));
  const tx = me.x / T, ty = me.y / T; $('zone').textContent = (ZONES.find(([a, b, w, h]) => tx >= a && tx < a + w && ty >= b && ty < b + h) || [0, 0, 0, 0, 'Plaza'])[4];
  if (master) master.gain.setTargetAtTime(muted ? 0 : inClub() ? .25 : .05, actx.currentTime, .2);
  music(dt);
}

/* ---------- draw ---------- */
let time = 0;
const TILE = { 0: '#2f4a3a', 1: '#6b6a7a', 2: '#394f57', 3: '#2d2b3f', 4: '#141824', 5: '#8a6f4d', 6: '#4a4560', 7: '#22466b', 8: '#fec837', 9: '#2f4a3a' };
function drawTile(t, x, y, tx, ty) {
  ctx.fillStyle = TILE[t]; ctx.fillRect(x, y, T, T);
  if (t === 0 || t === 9) { ctx.fillStyle = '#3a5a46'; if ((tx * 7 + ty * 3) % 5 === 0) ctx.fillRect(x + 4, y + 6, 2, 2); }
  if (t === 1) { ctx.fillStyle = '#7a7989'; if ((tx + ty) % 3 === 0) ctx.fillRect(x + 3, y + 3, 3, 2); }
  if (t === 2) { ctx.fillStyle = '#2d3d44'; ctx.fillRect(x, y + T - 4, T, 4); }
  if (t === 4) { const c = ['#fd9978', '#fec837', '#749593', '#a78bfa'][(tx + ty + Math.floor(time * 3)) % 4]; ctx.fillStyle = c; ctx.globalAlpha = .55; ctx.fillRect(x + 1, y + 1, T - 2, T - 2); ctx.globalAlpha = 1; }
  if (t === 7) { ctx.fillStyle = '#2d5a8a'; ctx.fillRect(x + ((tx * 5 + Math.floor(time * 4)) % 12), y + (ty * 3 % 12), 4, 1); }
  if (t === 8) { ctx.fillStyle = '#b8901f'; ctx.fillRect(x, y, T, 3); }
}
function drawTree(x, y) { ctx.fillStyle = '#4a3428'; ctx.fillRect(x + 6, y + 9, 4, 7); ctx.fillStyle = '#1f6b45'; ctx.fillRect(x + 1, y, 14, 11); ctx.fillStyle = '#2f8a5a'; ctx.fillRect(x + 3, y + 1, 5, 4); }
function drawPerson(p) {
  const x = Math.round(p.x - 6), y = Math.round(p.y - 14), f = Math.floor(p.step) % 2;
  ctx.fillStyle = '#0006'; ctx.fillRect(x + 1, y + 16, 10, 3);
  ctx.fillStyle = '#e8c39e'; ctx.fillRect(x + 2, y, 8, 7);         // head
  ctx.fillStyle = '#2b2233'; ctx.fillRect(x + 2, y - 1, 8, 3);     // hair
  ctx.fillStyle = p.color; ctx.fillRect(x + 1, y + 7, 10, 6);      // body
  ctx.fillStyle = '#242038'; ctx.fillRect(x + 2, y + 13 + (f ? 0 : 1), 3, 3); ctx.fillRect(x + 7, y + 13 + (f ? 1 : 0), 3, 3);
  if (p.dir !== 1) { ctx.fillStyle = '#000'; ctx.fillRect(x + (p.dir === 2 ? 3 : p.dir === 3 ? 7 : 4), y + 4, 1, 1); if (p.dir < 2) ctx.fillRect(x + 7, y + 4, 1, 1); }
}
function bubble(p) {
  if (!p.sayT) return; ctx.font = '8px monospace'; const w = Math.ceil(ctx.measureText(p.say).width) + 6, x = Math.round(p.x - w / 2), y = Math.round(p.y - 30);
  ctx.fillStyle = '#fff'; ctx.fillRect(x, y, w, 11); ctx.fillRect(Math.round(p.x) - 1, y + 11, 3, 2); ctx.fillStyle = '#141824'; ctx.fillText(p.say, x + 3, y + 8);
}
function nameTag(p) { ctx.font = '7px monospace'; const w = ctx.measureText(p.name).width; ctx.fillStyle = '#000a'; ctx.fillRect(Math.round(p.x - w / 2 - 2), Math.round(p.y + 6), w + 4, 9); ctx.fillStyle = p === me ? '#fec837' : '#fff'; ctx.fillText(p.name, Math.round(p.x - w / 2), Math.round(p.y + 13)); }
function draw() {
  const s = SCALE_R(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false; ctx.fillStyle = '#141824'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(s, 0, 0, s, -Math.round(cam.x * s), -Math.round(cam.y * s));
  const x0 = Math.max(0, Math.floor(cam.x / T)), y0 = Math.max(0, Math.floor(cam.y / T)), x1 = Math.min(MW, Math.ceil((cam.x + cv.width / s) / T)), y1 = Math.min(MH, Math.ceil((cam.y + cv.height / s) / T));
  for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) drawTile(map[j][i], i * T, j * T, i, j);
  const sorted = [...people].sort((a, b) => a.y - b.y), treeList = trees.map(([x, y]) => ({ tree: 1, x: x * T, y: y * T + 16 }));
  [...sorted, ...treeList].sort((a, b) => a.y - b.y).forEach(e => e.tree ? drawTree(e.x, e.y - 16) : drawPerson(e));
  people.forEach(nameTag); people.forEach(bubble);
  if (inClub()) { ctx.fillStyle = `hsla(${(time * 60) % 360},80%,60%,.08)`; ctx.fillRect(cam.x, cam.y, cv.width / s, cv.height / s); }
  const dark = .28 + .22 * Math.sin(time / 40); ctx.fillStyle = `rgba(10,12,40,${dark})`; ctx.fillRect(cam.x, cam.y, cv.width / s, cv.height / s);
}

/* ---------- boot ---------- */
let started = false, last = performance.now();
function resize() { cv.width = innerWidth; cv.height = innerHeight; }
addEventListener('resize', resize); resize();
function loop(now) { const dt = Math.min(.05, (now - last) / 1000); last = now; time += dt; if (started) update(dt); else { cam.x = 20 * T; cam.y = 3 * T; } draw(); requestAnimationFrame(loop); }
requestAnimationFrame(loop);

COLORS.forEach((c, i) => { const b = document.createElement('button'); b.type = 'button'; b.style.background = c; b.setAttribute('role', 'radio'); b.setAttribute('aria-label', 'Colour ' + (i + 1)); b.setAttribute('aria-checked', i === 0); b.onclick = () => { me.color = c; [...$('swatches').children].forEach(x => x.setAttribute('aria-checked', x === b)); }; $('swatches').append(b); });
$('name').value = store.get('nsc.name') || '';
$('join').onsubmit = e => { e.preventDefault(); me.name = $('name').value.trim() || 'wanderer'; store.set('nsc.name', me.name); $('join').remove(); ['hud', 'log'].forEach(id => { $(id).hidden = false; }); started = true; startAudio(); speak(me, 'hello city'); };
})();
