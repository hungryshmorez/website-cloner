(() => {
'use strict';
const SPEED = 120, BPM = 128;
const W = window.WORLD, cv = document.getElementById('game'), ctx = cv.getContext('2d');
const $ = id => document.getElementById(id);
const store = { get(k){ try { return localStorage.getItem(k); } catch { return null; } }, set(k,v){ try { localStorage.setItem(k,v); } catch { /* unavailable */ } } };

/* ---------- copy for stations (artist blurbs are the owner's own text) ---------- */
const WISHES = ['Your wish is granted, but the bass gets louder.', 'Your wish is granted. You now own one (1) glowstick.', 'Denied. The paw is on its break.', 'Your wish is granted. Everyone at the pit knows your name.', 'The paw curls a finger. Ask again after midnight.'];
const DECK_MODES = [['Four on the floor', [1, 0, 0, 0]], ['Broken beat', [1, 0, 1, 0, 0, 1, 0, 0]], ['Half-time wobble', [1, 0, 0, 0, 0, 0, 1, 0]]];

/* ---------- state ---------- */
const PX = 20; // world pixels per map unit
const C = W; // the campus
const COLORS = ['#fd9978', '#fec837', '#749593', '#a78bfa', '#f472b6', '#60a5fa'];
const me = { name: 'you', x: 0, y: 0, color: COLORS[0], dir: 0, step: 0, target: null, say: '', sayT: 0, style: 'plain' };
let started = false, muted = false, deck = 0, vjHue = 190, hasKey = store.get('mf.key') === '1', flash = 0, time = 0, panelOpen = false, mg = null, near = null, pending = null, mapOpen = false;
const crowd = [], cam = { x: 0, y: 0 }, keys = new Set(), IMG = {};
let chatting = false, seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const scene = { name: 'Campus' };

function imgFor(c) { if (!IMG[c.id]) { const i = new Image(); i.src = window.IMG_SRC ? window.IMG_SRC[c.id] : 'maps/' + c.id + '.jpg'; IMG[c.id] = i; } return IMG[c.id]; }
function blocked(px, py) {
  const i = Math.floor((px / PX - C.frame[0]) / C.cell), j = Math.floor((py / PX - C.frame[1]) / C.cell);
  if (i < 0 || j < 0 || i >= C.gw || j >= C.gh) return true;
  return C.grid[j * C.gw + i] === 1;
}
function buildCrowd() {
  ['Mo', 'Juno', 'kiwi', 'Bex', 'Tao', 'Ziggy', 'nova', 'Pip'].forEach((name, i) => {
    let x, y, n = 0; do { x = (-20 + rnd() * 40) * PX; y = (-8 + rnd() * 28) * PX; n++; } while (blocked(x, y) && n < 80);
    crowd.push({ name, x, y, color: COLORS[i % COLORS.length], dir: 0, step: 0, target: null, say: '', sayT: 0, style: 'plain', wait: rnd() * 3 });
  });
}
function notice(text) { const li = document.createElement('li'); li.textContent = text; li.style.color = '#fec837'; $('log').append(li); while ($('log').children.length > 5) $('log').firstChild.remove(); setTimeout(() => li.remove(), 12000); }

/* ---------- audio ---------- */
let actx, master, beatStep = 0, beatTimer = 0;
function startAudio() { if (actx) return; const C = window.AudioContext || window.webkitAudioContext; if (!C) return; actx = new C(); master = actx.createGain(); master.gain.value = 0; master.connect(actx.destination); }
function tone(f, d, type, v) { if (!actx) return; const o = actx.createOscillator(), g = actx.createGain(); o.type = type; o.frequency.value = f; g.gain.value = v; g.gain.exponentialRampToValueAtTime(.0001, actx.currentTime + d); o.connect(g).connect(master); o.start(); o.stop(actx.currentTime + d); }
function sfx(f, d = .08, type = 'square') { if (!actx || muted) return; const o = actx.createOscillator(), g = actx.createGain(); o.type = type; o.frequency.value = f; g.gain.value = .07; g.gain.exponentialRampToValueAtTime(.0001, actx.currentTime + d); o.connect(g).connect(actx.destination); o.start(); o.stop(actx.currentTime + d); }
function music(dt) {
  if (!actx || muted) return; beatTimer += dt; const step = 60 / BPM / 2; if (beatTimer < step) return; beatTimer -= step; beatStep++;
  const pat = DECK_MODES[deck][1], hit = pat[beatStep % pat.length];
  if (beatStep % 2 === 0 && (hit || deck === 0)) tone(52, .2, 'sine', .9);
  if (beatStep % 2 === 1) tone([110, 110, 131, 110, 147, 147, 131, 110][(beatStep >> 1) % 8], .1, 'square', .16);
  if (beatStep % 4 === 3) tone(4200, .03, 'square', .05);
}
function volume() { const d = Math.hypot(me.x / PX, me.y / PX + 24); return Math.max(.05, .3 - d * .006); }

/* ---------- input ---------- */
addEventListener('keydown', e => {
  if (!started) return;
  if (mg) { if (e.key === 'Escape') closeMg(); if (e.key === ' ') { e.preventDefault(); mg.press && mg.press(); } keys.add(e.key.toLowerCase()); return; }
  if (panelOpen) { if (e.key === 'Escape' || e.key.toLowerCase() === 'e' || e.key === 'Enter') closePanel(); return; }
  if (chatting) { if (e.key === 'Escape') closeChat(); return; }
  if (e.key === 'Enter') { e.preventDefault(); openChat(); return; }
  if (e.key.toLowerCase() === 'e') { interact(); return; }
  if (e.key.toLowerCase() === 'm') { toggleMap(); return; }
  if (e.key === 'Escape' && mapOpen) { toggleMap(); return; }
  keys.add(e.key.toLowerCase()); me.target = null;
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
const scale = () => Math.max(.7, Math.min(innerWidth / (28 * PX), innerHeight / (18 * PX)));
cv.addEventListener('pointerdown', e => {
  if (!started || panelOpen || mg) return; startAudio();
  const r = cv.getBoundingClientRect(), s = scale(), wx = (e.clientX - r.left) / s + cam.x, wy = (e.clientY - r.top) / s + cam.y;
  const hit = C.stations.filter(t => Math.hypot(t.x * PX - wx, t.z * PX - wy) < 30).sort((a, b) => Math.hypot(a.x * PX - wx, a.z * PX - wy) - Math.hypot(b.x * PX - wx, b.z * PX - wy))[0];
  if (hit) { pending = hit; me.target = { x: hit.x * PX, y: hit.z * PX }; return; }
  pending = null; me.target = { x: wx, y: wy };
});
$('act').onclick = () => interact();
function openChat() { chatting = true; $('chatForm').hidden = false; $('chatInput').focus(); }
function closeChat() { chatting = false; $('chatForm').hidden = true; $('chatInput').blur(); }
$('chatForm').onsubmit = e => { e.preventDefault(); const v = $('chatInput').value.trim(); $('chatInput').value = ''; closeChat(); if (v) speak(me, v); };
$('mute').onclick = e => { muted = !muted; e.currentTarget.setAttribute('aria-pressed', muted); };
function speak(p, text) {
  p.say = text; p.sayT = 5; const li = document.createElement('li'), b = document.createElement('b');
  b.textContent = p.name + ': '; li.append(b, document.createTextNode(text)); $('log').append(li);
  while ($('log').children.length > 5) $('log').firstChild.remove(); setTimeout(() => li.remove(), 14000);
}

/* ---------- panels ---------- */
function showPanel(title, role, body, extra) {
  const p = $('panel'); p.replaceChildren();
  const h = document.createElement('h2'); h.textContent = title; p.append(h);
  if (role) { const r = document.createElement('div'); r.className = 'role'; r.textContent = role; p.append(r); }
  (Array.isArray(body) ? body : [body]).forEach(t => { const q = document.createElement('p'); q.textContent = t; p.append(q); });
  if (extra) p.append(extra);
  const b = document.createElement('button'); b.className = 'btn'; b.textContent = 'Close'; b.onclick = closePanel; p.append(b);
  p.hidden = false; panelOpen = true; b.focus();
}
function closePanel() { $('panel').hidden = true; panelOpen = false; }

/* ---------- interactions ---------- */
const TRACKS = [['SLUSHWAVE 2025 (trailer)', 'slushwave-2025-trailer'], ['first ever vaporwave song', 'first-ever-vaporwave'], ['MindSpring Memories — Tranquility Wave', 'mindspring-tranquility'], ['desert sand feels warm at night', 'desert-sand'], ['t e l e p a t h', 'telepath'], ['t e l e p a t h II', 'telepath-2'], ['Illusionary', 'illusionary'], ['Illusionary (dub)', 'illusionary-dub'], ['Second Sight — At Dawn', 'second-sight-at-dawn'], ['Saturn 1985 — In the Air Tonight', 'saturn-1985'], ['S O A R E R', 'soarer'], ['channel 71 — Shine', 'channel71-shine'], ['channel 71 — sentiment (dub)', 'channel71-sentiment-dub'], ['neckbomb — Emerald', 'neckbomb-emerald'], ['neckbomb — Emerald II', 'neckbomb-emerald-2'], ['彼方 (kanata)', 'kanata']].map(([t, f]) => ({ title: t, url: C.MEDIA + f + '.mp3' }));
let player = null;
function linkBox(links) {
  const box = document.createElement('div'); box.style.cssText = 'display:flex;flex-direction:column;gap:6px';
  links.forEach(l => { const a = document.createElement('a'); a.className = 'btn'; a.href = l.u; a.target = '_blank'; a.rel = 'noopener'; a.textContent = l.t + ' ↗'; a.style.cssText = 'text-decoration:none;text-align:center'; box.append(a); });
  return box;
}
function jukebox() {
  const wrap = document.createElement('div'); wrap.style.cssText = 'display:flex;flex-direction:column;gap:4px;max-height:44vh;overflow:auto';
  const note = document.createElement('p'); note.style.color = '#fec837';
  TRACKS.forEach(t => {
    const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:6px;align-items:center';
    const play = document.createElement('button'); play.className = 'btn'; play.textContent = '▶'; play.setAttribute('aria-label', 'Play ' + t.title);
    play.onclick = () => { if (player) player.pause(); player = new Audio(t.url); player.onerror = () => { note.textContent = 'This page cannot stream from the music host. Use the ↗ link to open the track.'; }; player.play().then(() => { note.textContent = 'Now playing: ' + t.title; }).catch(() => { note.textContent = 'This page cannot stream from the music host. Use the ↗ link to open the track.'; }); };
    const a = document.createElement('a'); a.href = t.url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = t.title + ' ↗'; a.style.color = '#dbe6e4';
    row.append(play, a); wrap.append(row);
  });
  const stop = document.createElement('button'); stop.className = 'btn'; stop.textContent = 'Stop'; stop.onclick = () => { if (player) player.pause(); note.textContent = ''; };
  const box = document.createElement('div'); box.style.cssText = 'display:flex;flex-direction:column;gap:6px'; box.append(wrap, note, stop); return box;
}
function interact() {
  if (!near || panelOpen || mg) return; const t = near, id = t.id; sfx(660, .06);
  if (id === 'decks') { deck = (deck + 1) % DECK_MODES.length; showPanel('THE DECKS', 'center stage', 'Now spinning: ' + DECK_MODES[deck][0] + '. Press E again to change the beat. ' + t.text, linkBox(t.links)); return; }
  if (id === 'vj') { vjHue = (vjHue + 70) % 360; showPanel('VJ BOARD', 'runs the screens', 'The stage screens shift colour.'); return; }
  if (id === 'booth') { flash = 1; sfx(1200, .1, 'sine'); showPanel('PHOTO BOOTH', null, 'Click. Whatever that was, it looked great. (This build does not save photos.)'); return; }
  if (id === 'bench') { showPanel('PARK BENCH', 'where you spawned', 'You sit for a moment and watch the lights. Good spot.'); return; }
  if (id === 'jukebox') { showPanel('JUKEBOX', 'the festival playlist', 'Pick a track. The ↗ links open the real files on your media site.', jukebox()); return; }
  if (id === 'keycard') { if (hasKey) { showPanel('Hidden keycard', null, 'The spot where the keycard was. You already have it.'); return; } hasKey = true; store.set('mf.key', '1'); showPanel('Keycard found', null, 'A dusty backstage keycard. The vault in the northwest wants this.'); return; }
  if (id === 'vault') { showPanel('BACKSTAGE VAULT', 'locked door', hasKey ? 'The keycard clicks in. Inside: a shelf of dead batteries, a tour laminate, and a note that says "the real headliner was the crowd."' : 'The keypad blinks red. You need a keycard. Somebody probably dropped one on the east side.'); return; }
  if (id === 'board') return messageBoard(t.links);
  if (id === 'paw') { showPanel("THE MONKEY'S PAW", 'make a wish', WISHES[Math.floor(Math.random() * WISHES.length)]); return; }
  if (id === 'hoops') return startMg(hoops());
  if (id === 'gallery') return startMg(targets('SHOOTING GALLERY', 6, 22, 'gallery'));
  if (id === 'dunk') return startMg(targets('DUNK TANK', 1, 20, 'dunk'));
  if (id === 'dodge') return startMg(dodge());
  const extra = document.createElement('div'); extra.style.cssText = 'display:flex;flex-direction:column;gap:6px';
  if (t.links) extra.append(linkBox(t.links));
  showPanel(t.label, t.chunk ? C.NAMES[t.chunk] : null, t.text || 'Have a look around.', extra);
}
function messageBoard(links) {
  let msgs = []; try { msgs = JSON.parse(store.get('mf.board') || '[]'); } catch { msgs = []; }
  const wrap = document.createElement('div'); wrap.style.cssText = 'display:flex;flex-direction:column;gap:6px';
  const list = document.createElement('div'); list.style.cssText = 'max-height:140px;overflow:auto;background:#141824;padding:6px';
  const render = () => { list.replaceChildren(...(msgs.length ? msgs : ['Nobody has written anything yet.']).map(m => { const d = document.createElement('div'); d.textContent = m; return d; })); };
  render();
  const inp = document.createElement('input'); inp.maxLength = 80; inp.placeholder = 'Pin a note (saved on this device only)'; inp.setAttribute('aria-label', 'Note');
  const add = document.createElement('button'); add.className = 'btn'; add.textContent = 'Pin it';
  add.onclick = () => { const v = inp.value.trim(); if (!v) return; msgs = [...msgs.slice(-9), `${me.name}: ${v}`]; store.set('mf.board', JSON.stringify(msgs)); inp.value = ''; render(); };
  wrap.append(list, inp, add); if (links) wrap.append(linkBox(links)); showPanel('MESSAGE BOARD', 'artist directory', 'Notes people left on the festival board.', wrap);
}

/* ---------- mini-games ---------- */
function startMg(g) { mg = g; $('mgWrap').hidden = false; $('mgBar').textContent = g.title; keys.clear(); }
function closeMg() { if (mg && mg.onClose) mg.onClose(); mg = null; $('mgWrap').hidden = true; }
$('mgClose').onclick = closeMg;
const mgc = $('mg'), mx = mgc.getContext('2d'); let mgPointer = { x: 160, y: 120 };
function mgXY(e) { const r = mgc.getBoundingClientRect(); mgPointer = { x: (e.clientX - r.left) / r.width * 320, y: (e.clientY - r.top) / r.height * 240 }; return mgPointer; }
mgc.addEventListener('pointermove', mgXY);
mgc.addEventListener('pointerdown', e => { if (!mg) return; mgXY(e); mg.click && mg.click(mgPointer); mg.press && !mg.click && mg.press(); });
function best(id, score, higher = true) { const k = 'mf.best.' + id, o = Number(store.get(k)); if (!o || (higher ? score > o : score < o)) { store.set(k, String(score)); return score; } return o; }

function hoops() {
  const g = { title: 'BASKETBALL — Space / tap to shoot (10 shots)', t: 0, shots: 10, score: 0, ball: null, msg: '' };
  const pos = () => (Math.sin(g.t * 3.2) + 1) / 2;
  g.press = () => { if (g.ball || g.shots <= 0) { if (g.shots <= 0) closeMg(); return; } g.shots--; const p = pos(), err = Math.abs(p - .5); g.ball = { t: 0, ok: err < .1, good: err < .22 }; sfx(300, .1); };
  g.update = dt => { g.t += dt; if (g.ball) { g.ball.t += dt; if (g.ball.t > .9) { if (g.ball.ok) { g.score += 3; g.msg = 'SWISH +3'; sfx(880, .15, 'sine'); } else if (g.ball.good) { g.score += 2; g.msg = 'Bank +2'; sfx(660, .1); } else { g.msg = 'Miss'; sfx(120, .15, 'sawtooth'); } g.ball = null; if (g.shots <= 0) g.msg += ` — final ${g.score} (best ${best('hoops', g.score)})`; } } };
  g.draw = c => {
    c.fillStyle = '#0b0e18'; c.fillRect(0, 0, 320, 240); c.fillStyle = '#fd9978'; c.fillRect(120, 20, 80, 50); c.fillStyle = '#fff'; c.fillRect(140, 44, 40, 20); c.fillStyle = '#ff6b35'; c.fillRect(146, 70, 28, 4);
    c.fillStyle = '#525162'; c.fillRect(40, 200, 240, 14); c.fillStyle = g.ball ? '#525162' : '#39ff14'; c.fillRect(140, 200, 40, 14); c.fillStyle = '#fec837'; c.fillRect(40 + pos() * 232, 196, 8, 22);
    const b = g.ball; const p = b ? b.t / .9 : 0; const bx = b ? 160 + (b.ok ? 0 : (b.good ? 12 : 40)) * p : 160, by = b ? 180 - Math.sin(p * Math.PI) * 80 - p * 100 : 180;
    c.fillStyle = '#ff6b35'; c.beginPath(); c.arc(bx, by, 8, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.font = '12px monospace'; c.fillText(`Shots ${g.shots}   Score ${g.score}`, 10, 16); c.fillText(g.msg, 10, 236);
  };
  return g;
}
function targets(title, count, secs, kind) {
  const g = { title: title + ' — click the targets', left: secs, score: 0, list: [], done: false };
  const spawn = () => g.list.push({ x: Math.random() * 280 + 20, y: 40 + Math.random() * 130, vx: (Math.random() < .5 ? -1 : 1) * (30 + Math.random() * 60), r: kind === 'dunk' ? 16 : 11, hit: 0 });
  for (let i = 0; i < count; i++) spawn();
  g.click = p => { if (g.done) { closeMg(); return; } const t = g.list.find(o => !o.hit && Math.hypot(o.x - p.x, o.y - p.y) < o.r + 4); if (t) { t.hit = .4; g.score++; sfx(900, .07, 'sine'); } else sfx(140, .06, 'sawtooth'); };
  g.update = dt => { if (g.done) return; g.left -= dt; g.list.forEach(o => { o.x += o.vx * dt; if (o.x < 14 || o.x > 306) o.vx *= -1; if (o.hit) { o.hit -= dt; if (o.hit <= 0) { o.hit = 0; o.x = Math.random() * 280 + 20; o.y = 40 + Math.random() * 130; } } }); if (g.left <= 0) { g.done = true; g.final = best(kind, g.score); } };
  g.draw = c => {
    c.fillStyle = kind === 'dunk' ? '#123a5a' : '#231a33'; c.fillRect(0, 0, 320, 240); if (kind === 'dunk') { c.fillStyle = '#2d6a9a'; c.fillRect(0, 160, 320, 80); }
    g.list.forEach(o => { c.fillStyle = o.hit ? '#39ff14' : (kind === 'dunk' ? '#ffd24a' : '#ff0055'); c.beginPath(); c.arc(o.x, o.y, o.r, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(o.x, o.y, o.r / 2, 0, 7); c.fill(); });
    c.fillStyle = '#fff'; c.font = '12px monospace'; c.fillText(`Time ${Math.max(0, g.left).toFixed(0)}   Hits ${g.score}`, 10, 16); if (g.done) { c.fillStyle = '#000b'; c.fillRect(60, 90, 200, 60); c.fillStyle = '#fec837'; c.fillText(`Done! ${g.score} hits (best ${g.final})`, 76, 122); c.fillText('tap to leave', 110, 140); }
  };
  return g;
}
function dodge() {
  const g = { title: 'DODGE HELL — mouse / touch / arrows', px: 160, py: 200, t: 0, hazards: [], dead: false, acc: 0 };
  g.update = dt => {
    if (g.dead) return; g.t += dt; g.acc += dt;
    const k = (keys.has('arrowright') || keys.has('d')) - (keys.has('arrowleft') || keys.has('a')); if (k) g.px += k * 150 * dt; else g.px += (mgPointer.x - g.px) * Math.min(1, dt * 8);
    g.px = Math.max(8, Math.min(312, g.px));
    if (g.acc > Math.max(.12, .5 - g.t * .01)) { g.acc = 0; g.hazards.push({ x: Math.random() * 300 + 10, y: -10, v: 80 + Math.random() * 60 + g.t * 3, s: 8 + Math.random() * 8 }); }
    g.hazards.forEach(h => { h.y += h.v * dt; if (Math.abs(h.x - g.px) < h.s + 4 && Math.abs(h.y - g.py) < h.s + 4) g.dead = true; }); g.hazards = g.hazards.filter(h => h.y < 250);
    if (g.dead) { g.best = best('dodge', Math.floor(g.t)); sfx(90, .4, 'sawtooth'); }
  };
  g.click = () => { if (g.dead) closeMg(); };
  g.draw = c => {
    c.fillStyle = '#1a0510'; c.fillRect(0, 0, 320, 240); g.hazards.forEach(h => { c.fillStyle = '#ff0055'; c.fillRect(h.x - h.s / 2, h.y - h.s / 2, h.s, h.s); });
    c.fillStyle = '#39ff14'; c.fillRect(g.px - 5, g.py - 5, 10, 10); c.fillStyle = '#fff'; c.font = '12px monospace'; c.fillText(`Survived ${g.t.toFixed(1)}s`, 10, 16);
    if (g.dead) { c.fillStyle = '#000b'; c.fillRect(60, 90, 200, 60); c.fillStyle = '#fec837'; c.fillText(`Burned at ${g.t.toFixed(1)}s (best ${g.best}s)`, 70, 122); c.fillText('tap to leave', 110, 140); }
  };
  return g;
}
function theaterShow() {
  const g = { title: 'IMMERSIVE THEATER — now showing: house reel', t: 0 };
  g.update = dt => { g.t += dt; }; g.click = () => closeMg(); g.press = () => closeMg();
  g.draw = c => { c.fillStyle = '#05050e'; c.fillRect(0, 0, 320, 240); for (let i = 0; i < 16; i++) { c.fillStyle = `hsl(${(g.t * 60 + i * 22) % 360},80%,55%)`; const h = 30 + Math.abs(Math.sin(g.t * 3 + i)) * 130; c.fillRect(10 + i * 19, 220 - h, 14, h); } c.fillStyle = '#fff'; c.font = '12px monospace'; c.fillText('tap or press Space to leave', 78, 20); };
  return g;
}

/* ---------- movement ---------- */
function move(p, dx, dy, dt, run) {
  if (!dx && !dy) { p.step = 0; return; }
  const len = Math.hypot(dx, dy), v = SPEED * dt * (run ? 1.8 : 1); dx = dx / len * v; dy = dy / len * v;
  if (!blocked(p.x + dx, p.y)) p.x += dx;
  if (!blocked(p.x, p.y + dy)) p.y += dy;
  p.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 3 : 2) : (dy > 0 ? 0 : 1); p.step += dt * (run ? 12 : 8);
}
const chunkAt = (px, py) => C.chunkAt(px / PX, py / PX);
function update(dt) {
  time += dt; flash = Math.max(0, flash - dt * 2);
  if (!panelOpen && !mg && !chatting && !mapOpen) {
    const run = keys.has('shift');
    let dx = (keys.has('d') || keys.has('arrowright')) - (keys.has('a') || keys.has('arrowleft')), dy = (keys.has('s') || keys.has('arrowdown')) - (keys.has('w') || keys.has('arrowup'));
    if (me.target && !dx && !dy) { const tx = me.target.x - me.x, ty = me.target.y - me.y; if (Math.hypot(tx, ty) < 4 || (pending && Math.hypot(tx, ty) < 1.8 * PX)) { me.target = null; if (pending) { near = pending; pending = null; interact(); } } else { const ox = me.x, oy = me.y; move(me, tx, ty, dt, true); if (ox === me.x && oy === me.y) { me.target = null; if (pending && Math.hypot(tx, ty) < 3.5 * PX) { near = pending; pending = null; interact(); } pending = null; } } }
    else { if (dx || dy) pending = null; move(me, dx, dy, dt, run); }
  }
  crowd.forEach(n => {
    n.wait -= dt; if (n.wait <= 0 && !n.target) { n.target = { x: n.x + (rnd() - .5) * 200, y: n.y + (rnd() - .5) * 160 }; n.wait = 2 + rnd() * 5; if (rnd() < .12) speak(n, ['this bass tho', 'woo', 'one more song', 'nice moves', 'who is on next?'][Math.floor(rnd() * 5)]); }
    if (n.target) { const tx = n.target.x - n.x, ty = n.target.y - n.y; if (Math.hypot(tx, ty) < 3) n.target = null; else { const ox = n.x, oy = n.y; move(n, tx, ty, dt); if (ox === n.x && oy === n.y) n.target = null; } } else n.step = 0;
  });
  [me, ...crowd].forEach(p => { p.sayT = Math.max(0, p.sayT - dt); });
  const ux = me.x / PX, uz = me.y / PX;
  near = null; let bd = 2.0; C.stations.forEach(t => { const d = Math.hypot(t.x - ux, t.z - uz); if (d < bd) { bd = d; near = t; } });
  $('prompt').hidden = !near || panelOpen || !!mg; if (near) $('prompt').textContent = 'E / tap — ' + near.label; $('act').hidden = !near || panelOpen || !!mg || !matchMedia('(pointer:coarse)').matches;
  const s = scale(), f = C.frame, vw = cv.width / s, vh = cv.height / s;
  cam.x = Math.max(f[0] * PX, Math.min((f[0] + f[2]) * PX - vw, me.x - vw / 2)); cam.y = Math.max(f[1] * PX, Math.min((f[1] + f[3]) * PX - vh, me.y - vh / 2));
  const ch = chunkAt(me.x, me.y); $('zone').textContent = ch ? ch.name : 'Campus road';
  if (master) master.gain.setTargetAtTime(muted ? 0 : volume(), actx.currentTime, .2); music(dt);
  if (mg) mg.update(dt);
}

/* ---------- drawing ---------- */
const beat = () => 1 - (time * BPM / 60) % 1;
function drawPerson(p) {
  const x = Math.round(p.x - 6), y = Math.round(p.y - 14), f = Math.floor(p.step) % 2, c = ctx;
  c.fillStyle = '#0006'; c.fillRect(x + 1, y + 16, 10, 3);
  c.fillStyle = '#e8c39e'; c.fillRect(x + 2, y, 8, 7); c.fillStyle = '#2b2233'; c.fillRect(x + 2, y - 1, 8, 3);
  c.fillStyle = p.color; c.fillRect(x + 1, y + 7, 10, 6); c.fillStyle = '#242038'; c.fillRect(x + 2, y + 13 + (f ? 0 : 1), 3, 3); c.fillRect(x + 7, y + 13 + (f ? 1 : 0), 3, 3);
  if (p.dir !== 1) { c.fillStyle = '#000'; c.fillRect(x + (p.dir === 2 ? 3 : p.dir === 3 ? 7 : 4), y + 4, 1, 1); if (p.dir < 2) c.fillRect(x + 7, y + 4, 1, 1); }
}
function bubble(p) { if (!p.sayT) return; ctx.font = '8px monospace'; const w = Math.ceil(ctx.measureText(p.say).width) + 6, x = Math.round(p.x - w / 2), y = Math.round(p.y - 30); ctx.fillStyle = '#fff'; ctx.fillRect(x, y, w, 11); ctx.fillRect(Math.round(p.x) - 1, y + 11, 3, 2); ctx.fillStyle = '#141824'; ctx.fillText(p.say, x + 3, y + 8); }
function tag(text, x, y, color) { ctx.font = '7px monospace'; const w = ctx.measureText(text).width; ctx.fillStyle = '#000b'; ctx.fillRect(Math.round(x - w / 2 - 2), Math.round(y), w + 4, 9); ctx.fillStyle = color; ctx.fillText(text, Math.round(x - w / 2), Math.round(y + 7)); }
function draw() {
  const s = scale(), f = C.frame, vw = cv.width / s, vh = cv.height / s; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false; ctx.fillStyle = '#05050e'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(s, 0, 0, s, -Math.round(cam.x * s), -Math.round(cam.y * s));
  const inView = (x, y, w, h) => x * PX < cam.x + vw && (x + w) * PX > cam.x && y * PX < cam.y + vh && (y + h) * PX > cam.y;
  C.chunks.forEach(c => { const fr = c.frame; if (!inView(fr[0], fr[1], fr[2], fr[3])) return; const im = imgFor(c); if (im.complete && im.naturalWidth) { ctx.imageSmoothingEnabled = true; ctx.drawImage(im, fr[0] * PX, fr[1] * PX, fr[2] * PX, fr[3] * PX); ctx.imageSmoothingEnabled = false; } else { ctx.fillStyle = '#10121c'; ctx.fillRect(fr[0] * PX, fr[1] * PX, fr[2] * PX, fr[3] * PX); } });
  C.roads.forEach(r => { if (!inView(r.x, r.z, r.w, r.h)) return; ctx.fillStyle = '#23263a'; ctx.fillRect(r.x * PX, r.z * PX, r.w * PX, r.h * PX); ctx.fillStyle = '#fec83755'; if (r.w > r.h) ctx.fillRect(r.x * PX, (r.z + r.h / 2) * PX - 1, r.w * PX, 2); else ctx.fillRect((r.x + r.w / 2) * PX - 1, r.z * PX, 2, r.h * PX); });
  const fx = C.chunks[0]; if (fx.id === 'festival') { const g = ctx.createRadialGradient(0, -20 * PX, 0, 0, -20 * PX, 14 * PX); g.addColorStop(0, `hsla(${vjHue},90%,60%,${.12 + beat() * .22})`); g.addColorStop(1, 'transparent'); ctx.fillStyle = g; ctx.fillRect(-20 * PX, -34 * PX, 40 * PX, 34 * PX); }
  C.chunks.forEach(c => { const fr = c.frame; if (inView(fr[0], fr[1], fr[2], 6)) tag(c.name, (fr[0] + fr[2] / 2) * PX, (fr[1] + 1) * PX, '#fec837'); });
  C.stations.forEach(t => { if (!inView(t.x - 4, t.z - 4, 8, 8)) return; if (t === near || t === pending) { ctx.strokeStyle = '#fec837'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(t.x * PX, t.z * PX, 14 + beat() * 3, 0, 7); ctx.stroke(); } else if (t.links) { ctx.strokeStyle = '#fec83777'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(t.x * PX, t.z * PX, 9, 0, 7); ctx.stroke(); } if (t.links || t.role || t.kind === 'person' || t.kind === 'epk' || t.kind === 'sign') tag(t.label, t.x * PX, t.z * PX + 12, '#fff'); });
  [me, ...crowd].sort((a, b) => a.y - b.y).forEach(drawPerson);
  [me, ...crowd].forEach(p => tag(p.name, p.x, p.y + 6, p === me ? '#fec837' : '#fff')); [me, ...crowd].forEach(bubble);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash})`; ctx.fillRect(0, 0, cv.width, cv.height); }
  if (mapOpen) drawMap();
  if (mg) mg.draw(mx);
}
function toggleMap() { mapOpen = !mapOpen; }
function drawMap() {
  const f = C.frame, s = Math.min((cv.width - 40) / f[2], (cv.height - 70) / f[3]), W0 = f[2] * s, H0 = f[3] * s, ox = (cv.width - W0) / 2, oy = 50;
  ctx.fillStyle = '#05050ecc'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.fillStyle = '#10121c'; ctx.fillRect(ox, oy, W0, H0);
  ctx.fillStyle = '#3a3f55'; C.roads.forEach(r => ctx.fillRect(ox + (r.x - f[0]) * s, oy + (r.z - f[1]) * s, Math.max(1.5, r.w * s), Math.max(1.5, r.h * s)));
  ctx.font = '11px monospace'; C.chunks.forEach(c => { const fr = c.frame, x = ox + (fr[0] - f[0]) * s, y = oy + (fr[1] - f[1]) * s; ctx.strokeStyle = '#fec837'; ctx.lineWidth = 1; ctx.strokeRect(x, y, fr[2] * s, fr[3] * s); ctx.fillStyle = '#fec837'; ctx.fillText(c.name.split(' — ')[0], x + 3, y + 12); });
  ctx.fillStyle = '#ff2d78'; ctx.beginPath(); ctx.arc(ox + (me.x / PX - f[0]) * s, oy + (me.y / PX - f[1]) * s, 5, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '13px monospace'; ctx.fillText('MAP — press M or Esc to close · pink dot is you', ox, oy - 6);
}

/* ---------- boot ---------- */
let last = performance.now();
function resize() { cv.width = innerWidth; cv.height = innerHeight; } addEventListener('resize', resize); resize();
function loop(now) { const dt = Math.min(.05, (now - last) / 1000); last = now; if (started) update(dt); else { time += dt; cam.x = -20 * PX; cam.y = -28 * PX; } draw(); requestAnimationFrame(loop); }
requestAnimationFrame(loop);
if (location.hash === '#debug') window.__mf = { C, me, cam, scale, interact: () => interact(), PX, blocked, get near() { return near && near.id; } };
COLORS.forEach((c, i) => { const b = document.createElement('button'); b.type = 'button'; b.style.background = c; b.setAttribute('role', 'radio'); b.setAttribute('aria-label', 'Colour ' + (i + 1)); b.setAttribute('aria-checked', i === 0); b.onclick = () => { me.color = c; [...$('swatches').children].forEach(x => x.setAttribute('aria-checked', x === b)); }; $('swatches').append(b); });
$('name').value = store.get('mf.name') || '';
$('join').onsubmit = e => { e.preventDefault(); me.name = $('name').value.trim() || 'wanderer'; store.set('mf.name', me.name); $('join').remove(); ['hud', 'log'].forEach(id => { $(id).hidden = false; }); started = true; startAudio(); me.x = C.spawn[0] * PX; me.y = C.spawn[1] * PX; buildCrowd(); speak(me, 'made it'); notice('One continuous campus: follow the gold-lined roads. Press M for the map, Shift to run. Gold rings open real links.'); };
})();
