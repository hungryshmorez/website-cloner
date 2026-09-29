(() => {
'use strict';
const T = 16, SPEED = 72, BPM = 128;
const W = window.WORLD, cv = document.getElementById('game'), ctx = cv.getContext('2d');
const $ = id => document.getElementById(id);
const store = { get(k){ try { return localStorage.getItem(k); } catch { return null; } }, set(k,v){ try { localStorage.setItem(k,v); } catch { /* unavailable */ } } };

/* ---------- copy for stations (artist blurbs are the owner's own text) ---------- */
const INFO = {
  ravecharles: ['RAVE CHARLES', 'headliner // in the pit', 'The masked headliner, down in the mosh pit with the crowd instead of above it. Glowing LED visor, nearly 400 shows across America, 2014–2020.'],
  shmorez: ['SHMOREZ', 'the campfire // out back', 'A toasted marshmallow man squishing to the bass. Cozy-surreal campground, giant bonfire, s\'mores land.'],
  sofaboi: ['SOFA KING SAD BOI', 'the lounge // up on his own stage', 'Hood up, slumped on a beat-up couch under his own little rain cloud. Dubstep and weird bass.'],
  driftwave: ['DRIFTWAVE STATIC', 'chill zone', 'A chrome vaporwave figure in shades, haloed by a retro striped sun. Slushwave, ambient, vaporwave.'],
  tanky: ['TANKY JOHNSON', 'the tailgate // right', 'The outlaw of the void: a cowboy in a brown hat, white tee and blue jeans. Outlaw country.'],
  studio: ['12MATT3R', 'somewhere in the crowd', 'A glitching, RGB-splitting figure driving every screen at the festival. Glitch art, code, the collective.'],
  merch: ['THE MERCH TENT', 'the vendor', 'Tees, hoodies, shorts. Tap any piece to see front and back, sizes and price. (Placeholder shelf in this build.)'],
  kiosk: ['TOOLS KIOSK', 'vendor alley', 'A little stand of creator tools. Nothing to buy here yet.'],
  lounge: ['THE LOUNGE', 'left wall', 'Beat-up couches and a very good view of the stage. Take a load off.'],
  dealer: ['PROPS DEALER', 'behind the crowd', '"Everything on this table fell off something bigger. No refunds."'],
  porta: ["PORTA JOHN'S", 'east side', 'Occupied. Somebody is humming the headliner.'],
  lab: ['THE LAB', 'launcher hub', 'Where experiments live. The doors are still being painted.'],
  welcome: ['THE COMPLEX', 'immersive experience complex', 'A rusty neon warehouse. The central hub opens to the Midway arcade on the west and the Immersive Theater on the east.'],
  orb: ['THE HEART', 'central hub', 'A levitating orb that hums in time with the festival outside.'],
  'cab-flash': ['FLASH PORTAL', 'cabinet', 'Out of order. The portal is still warming up.'],
  'cab-wake': ['WAKE UP', 'cabinet', 'Out of order. It keeps hitting snooze.'],
  'cab-games': ['GAMES', 'cabinet', 'Out of order. Insert imagination.'],
  'cab-stories': ['STORIES', 'cabinet', 'Out of order. The plot is still loading.']
};
const WISHES = ['Your wish is granted, but the bass gets louder.', 'Your wish is granted. You now own one (1) glowstick.', 'Denied. The paw is on its break.', 'Your wish is granted. Everyone at the pit knows your name.', 'The paw curls a finger. Ask again after midnight.'];
const DECK_MODES = [['Four on the floor', [1, 0, 0, 0]], ['Broken beat', [1, 0, 1, 0, 0, 1, 0, 0]], ['Half-time wobble', [1, 0, 0, 0, 0, 0, 1, 0]]];

/* ---------- state ---------- */
const COLORS = ['#fd9978', '#fec837', '#749593', '#a78bfa', '#f472b6', '#60a5fa'];
const me = { name: 'you', x: 0, y: 0, color: COLORS[0], dir: 0, step: 0, target: null, say: '', sayT: 0, style: 'plain' };
let scene = W.F, started = false, muted = false, deck = 0, vjHue = 190, hasKey = store.get('mf.key') === '1', flash = 0, time = 0, panelOpen = false, mg = null, near = null;
const crowd = [];
const cam = { x: 0, y: 0 };
const keys = new Set();
let chatting = false, seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

function enter(s, tx, ty) { scene = s; me.x = tx * T + T / 2; me.y = ty * T + T; me.target = null; buildCrowd(); }
function buildCrowd() {
  crowd.length = 0;
  if (scene.id !== 'festival') return;
  const names = ['Mo', 'Juno', 'kiwi', 'Bex', 'Tao', 'Ziggy', 'nova', 'Pip', 'Rue', 'Sol', 'Dex', 'Lumi', 'Kit', 'Ash'];
  names.forEach((name, i) => { const c = { name, x: (30 + rnd() * 30) * T, y: (32 + rnd() * 18) * T, color: COLORS[i % COLORS.length], dir: 0, step: 0, target: null, say: '', sayT: 0, style: 'plain', wait: rnd() * 3 }; crowd.push(c); });
}
const blocked = (x, y) => { const tx = Math.floor(x / T), ty = Math.floor(y / T); if (tx < 0 || ty < 0 || tx >= scene.w || ty >= scene.h) return true; const t = scene.tiles[ty][tx]; return t === 2 || t === 9 || scene.block[ty][tx]; };

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
function volume() { const [sx, sy] = [45 * T, 6 * T]; if (scene.id === 'festival') { const d = Math.hypot(me.x - sx, me.y - sy) / T; return Math.max(.04, .28 - d * .004); } return scene.id === 'midway' ? .08 : scene.id === 'theater' ? .12 : .1; }

/* ---------- input ---------- */
addEventListener('keydown', e => {
  if (!started) return;
  if (mg) { if (e.key === 'Escape') closeMg(); if (e.key === ' ') { e.preventDefault(); mg.press && mg.press(); } keys.add(e.key.toLowerCase()); return; }
  if (panelOpen) { if (e.key === 'Escape' || e.key.toLowerCase() === 'e' || e.key === 'Enter') closePanel(); return; }
  if (chatting) { if (e.key === 'Escape') closeChat(); return; }
  if (e.key === 'Enter') { e.preventDefault(); openChat(); return; }
  if (e.key.toLowerCase() === 'e') { interact(); return; }
  keys.add(e.key.toLowerCase()); me.target = null;
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
const scale = () => Math.max(2, Math.round(Math.min(innerWidth / 320, innerHeight / 200)));
cv.addEventListener('pointerdown', e => { if (!started || panelOpen || mg) return; startAudio(); const r = cv.getBoundingClientRect(), s = scale(); me.target = { x: (e.clientX - r.left) / s + cam.x, y: (e.clientY - r.top) / s + cam.y }; });
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
function interact() {
  if (!near || panelOpen || mg) return; const id = near.id; sfx(660, .06);
  if (id === 'decks') { deck = (deck + 1) % DECK_MODES.length; showPanel('THE DECKS', 'center stage', 'Now spinning: ' + DECK_MODES[deck][0] + '. The whole festival follows the beat.'); return; }
  if (id === 'vj') { vjHue = (vjHue + 70) % 360; showPanel('VJ BOARD', 'runs the screens', 'The stage screens shift colour.'); return; }
  if (id === 'booth') { flash = 1; sfx(1200, .1, 'sine'); showPanel('PHOTO BOOTH', null, 'Click. Whatever that was, it looked great. (This build does not save photos.)'); return; }
  if (id === 'bench') { showPanel('PARK BENCH', 'where you spawned', 'You sit for a moment and watch the lights. Good spot.'); return; }
  if (id === 'keycard') { if (hasKey) { showPanel('Hidden keycard', null, 'The spot where the keycard was. You already have it.'); return; } hasKey = true; store.set('mf.key', '1'); showPanel('Keycard found', null, 'A dusty backstage keycard. Somewhere behind the crowd there is a door that wants this.'); return; }
  if (id === 'vault') { showPanel('BACKSTAGE VAULT', 'locked door', hasKey ? 'The keycard clicks in. Inside: a shelf of dead batteries, a tour laminate, and a note that says "the real headliner was the crowd."' : 'The keypad blinks red. You need a keycard. Somebody probably dropped one on the east side.'); return; }
  if (id === 'board') return messageBoard();
  if (id === 'paw') { showPanel("THE MONKEY'S PAW", 'make a wish', WISHES[Math.floor(Math.random() * WISHES.length)]); return; }
  if (id === 'hoops') return startMg(hoops());
  if (id === 'gallery') return startMg(targets('SHOOTING GALLERY', 6, 22, 'gallery'));
  if (id === 'dunk') return startMg(targets('DUNK TANK', 1, 20, 'dunk'));
  if (id === 'dodge') return startMg(dodge());
  if (id === 'screen') return startMg(theaterShow());
  const i = INFO[id]; if (i) showPanel(i[0], i[1], i[2]);
}
function messageBoard() {
  let msgs = []; try { msgs = JSON.parse(store.get('mf.board') || '[]'); } catch { msgs = []; }
  const wrap = document.createElement('div'); wrap.style.cssText = 'display:flex;flex-direction:column;gap:6px';
  const list = document.createElement('div'); list.style.cssText = 'max-height:140px;overflow:auto;background:#141824;padding:6px';
  const render = () => { list.replaceChildren(...(msgs.length ? msgs : ['Nobody has written anything yet.']).map(m => { const d = document.createElement('div'); d.textContent = m; return d; })); };
  render();
  const inp = document.createElement('input'); inp.maxLength = 80; inp.placeholder = 'Pin a note (saved on this device only)'; inp.setAttribute('aria-label', 'Note');
  const add = document.createElement('button'); add.className = 'btn'; add.textContent = 'Pin it';
  add.onclick = () => { const v = inp.value.trim(); if (!v) return; msgs = [...msgs.slice(-9), `${me.name}: ${v}`]; store.set('mf.board', JSON.stringify(msgs)); inp.value = ''; render(); };
  wrap.append(list, inp, add); showPanel('MESSAGE BOARD', 'artist directory', 'Notes people left on the festival board.', wrap);
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
function move(p, dx, dy, dt) {
  if (!dx && !dy) { p.step = 0; return; }
  const len = Math.hypot(dx, dy); dx = dx / len * SPEED * dt; dy = dy / len * SPEED * dt;
  if (!blocked(p.x + dx, p.y + dy * 0 - 2)) p.x += dx;
  if (!blocked(p.x, p.y + dy - 2)) p.y += dy;
  p.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 3 : 2) : (dy > 0 ? 0 : 1); p.step += dt * 8;
}
function update(dt) {
  time += dt; flash = Math.max(0, flash - dt * 2);
  if (!panelOpen && !mg && !chatting) {
    let dx = (keys.has('d') || keys.has('arrowright')) - (keys.has('a') || keys.has('arrowleft')), dy = (keys.has('s') || keys.has('arrowdown')) - (keys.has('w') || keys.has('arrowup'));
    if (me.target && !dx && !dy) { const tx = me.target.x - me.x, ty = me.target.y - me.y; if (Math.hypot(tx, ty) < 3) me.target = null; else { dx = tx; dy = ty; } }
    move(me, dx, dy, dt);
  }
  crowd.forEach(n => {
    n.wait -= dt; if (n.wait <= 0 && !n.target) { n.target = { x: n.x + (rnd() - .5) * 140, y: n.y + (rnd() - .5) * 100 }; n.wait = 2 + rnd() * 5; if (rnd() < .12) speak(n, ['this bass tho', 'woo', 'one more song', 'nice moves', 'who is on next?'][Math.floor(rnd() * 5)]); }
    if (n.target) { const tx = n.target.x - n.x, ty = n.target.y - n.y; if (Math.hypot(tx, ty) < 3) n.target = null; else { const ox = n.x, oy = n.y; move(n, tx, ty, dt); if (ox === n.x && oy === n.y) n.target = null; } } else n.step = 0;
  });
  [me, ...crowd].forEach(p => { p.sayT = Math.max(0, p.sayT - dt); });
  // doors
  const tx = Math.floor(me.x / T), ty = Math.floor((me.y - 2) / T);
  const d = scene.doors.find(o => tx >= o.x && tx < o.x + o.w && ty >= o.y && ty < o.y + o.h);
  if (d && !mg) { enter(W.scenes[d.to], d.tx, d.ty); sfx(440, .1, 'triangle'); }
  // nearest station
  near = null; let bd = 34; scene.stations.forEach(s => { const dd = Math.hypot(s.x * T + T / 2 - me.x, s.y * T + T / 2 - me.y); if (dd < bd) { bd = dd; near = s; } });
  $('prompt').hidden = !near || panelOpen || !!mg; if (near) $('prompt').textContent = 'E — ' + near.label; $('act').hidden = !near || panelOpen || !!mg || !matchMedia('(pointer:coarse)').matches;
  const s = scale(); cam.x = Math.max(0, Math.min(scene.w * T - cv.width / s, me.x - cv.width / s / 2)); cam.y = Math.max(0, Math.min(scene.h * T - cv.height / s, me.y - cv.height / s / 2));
  const z = scene.zones.find(([a, b, w, h]) => { const ux = me.x / T, uy = me.y / T; return ux >= a && ux < a + w && uy >= b && uy < b + h; }); $('zone').textContent = z ? z[4] : scene.name;
  if (master) master.gain.setTargetAtTime(muted ? 0 : volume(), actx.currentTime, .2); music(dt);
  if (mg) mg.update(dt);
}

/* ---------- drawing ---------- */
const beat = () => 1 - (time * BPM / 60) % 1;
const TILE = { 0: '#1f2f26', 1: '#5b5a6c', 2: '#3a3f49', 3: '#2f2b3f', 4: '#141824', 5: '#2a2440', 8: '#fec837', 9: '#1f2f26', 10: '#2a2a3a', 11: '#4a2a3c', 12: '#1c1a2a' };
function drawTile(t, x, y, tx, ty) {
  ctx.fillStyle = TILE[t]; ctx.fillRect(x, y, T, T);
  if (t === 0 && (tx * 7 + ty * 3) % 6 === 0) { ctx.fillStyle = '#28402f'; ctx.fillRect(x + 4, y + 6, 2, 2); }
  if (t === 1 && (tx + ty) % 3 === 0) { ctx.fillStyle = '#6b6a7c'; ctx.fillRect(x + 3, y + 3, 3, 2); }
  if (t === 2) { ctx.fillStyle = '#2b3038'; ctx.fillRect(x, y + T - 4, T, 4); }
  if (t === 4) { ctx.fillStyle = ['#ff0055', '#00f3ff', '#b967ff', '#39ff14'][(tx + ty + Math.floor(time * 2)) % 4]; ctx.globalAlpha = .25 + beat() * .4; ctx.fillRect(x + 1, y + 1, T - 2, T - 2); ctx.globalAlpha = 1; }
  if (t === 5) { ctx.fillStyle = `hsla(${vjHue},90%,60%,${.08 + beat() * .18})`; ctx.fillRect(x, y, T, T); }
  if (t === 8) { ctx.fillStyle = '#b8901f'; ctx.fillRect(x, y, T, 3); }
  if (t === 10 && (tx + ty) % 2 === 0) { ctx.fillStyle = '#3a3a52'; ctx.fillRect(x, y, T, T); }
  if (t === 11 && ty % 2 === 0) { ctx.fillStyle = '#5a3248'; ctx.fillRect(x, y, T, 4); }
  if (t === 9) { ctx.fillStyle = '#4a3428'; ctx.fillRect(x + 6, y + 8, 4, 8); ctx.fillStyle = '#1f6b45'; ctx.fillRect(x + 1, y - 4, 14, 13); }
}
function drawProp(p) {
  const x = p.x * T, y = p.y * T, w = p.w * T, h = p.h * T, c = ctx;
  switch (p.type) {
    case 'led': c.fillStyle = '#05050e'; c.fillRect(x, y, w, h); c.fillStyle = `hsla(${vjHue},90%,${45 + beat() * 20}%,.85)`; c.fillRect(x + 4, y + 4, w / 2 - 8, h - 8); c.fillRect(x + w / 2 + 4, y + 4, w / 2 - 8, h - 8); c.fillStyle = '#fff'; c.font = '8px monospace'; c.fillText('12 MEGA FESTIVAL', x + w / 2 - 34, y + h / 2); break;
    case 'decks': c.fillStyle = '#20202c'; c.fillRect(x, y, w, h); c.fillStyle = '#00f3ff'; c.beginPath(); c.arc(x + 14, y + h / 2, 9, 0, 7); c.arc(x + w - 14, y + h / 2, 9, 0, 7); c.fill(); c.fillStyle = '#ff0055'; c.fillRect(x + w / 2 - 4, y + 4, 8, h - 8); break;
    case 'couch': c.fillStyle = p.color; c.fillRect(x, y, w, h); c.fillStyle = '#0004'; c.fillRect(x, y, w, 4); break;
    case 'sun': c.fillStyle = '#b967ff'; c.beginPath(); c.arc(x + w / 2, y + h, w / 2, Math.PI, 0); c.fill(); c.fillStyle = '#ff6ec7'; for (let i = 0; i < 4; i++) c.fillRect(x + 6, y + 10 + i * 8, w - 12, 2); break;
    case 'fire': c.fillStyle = '#4a3428'; c.fillRect(x, y + h - 6, w, 6); c.fillStyle = beat() > .5 ? '#ffb347' : '#ff6b35'; c.fillRect(x + 6, y - 4 - beat() * 4, 10, 14); c.fillStyle = '#ffe08a'; c.fillRect(x + 9, y + 2, 4, 6); break;
    case 'truck': c.fillStyle = '#2f4a6a'; c.fillRect(x, y, w, h); c.fillStyle = '#5a7a9a'; c.fillRect(x + w - 26, y - 8, 26, 12); c.fillStyle = '#111'; c.fillRect(x + 6, y + h - 4, 12, 8); c.fillRect(x + w - 18, y + h - 4, 12, 8); break;
    case 'tent': c.fillStyle = p.color; c.fillRect(x, y + 10, w, h - 10); c.beginPath(); c.moveTo(x - 4, y + 12); c.lineTo(x + w / 2, y - 6); c.lineTo(x + w + 4, y + 12); c.fill(); c.fillStyle = '#0006'; c.fillRect(x + w / 2 - 6, y + h - 14, 12, 14); break;
    case 'stall': c.fillStyle = p.color; c.fillRect(x, y, w, h); c.fillStyle = '#0005'; c.fillRect(x, y + h - 10, w, 10); break;
    case 'vault': c.fillStyle = '#3a3f49'; c.fillRect(x, y, w, h); c.fillStyle = hasKey ? '#39ff14' : '#ff0055'; c.fillRect(x + w - 10, y + 10, 5, 5); break;
    case 'porta': for (let i = 0; i < 3; i++) { c.fillStyle = ['#2f6f9f', '#3a8a5a', '#9a5a2f'][i]; c.fillRect(x + i * 32 + 2, y - 8, 28, h + 8); c.fillStyle = '#0006'; c.fillRect(x + i * 32 + 8, y + 2, 16, 24); } break;
    case 'booth': c.fillStyle = '#7a2fa0'; c.fillRect(x, y, w, h); c.fillStyle = '#fff'; c.fillRect(x + 8, y + 6, 32, 24); break;
    case 'board': c.fillStyle = '#5a4a2f'; c.fillRect(x, y, w, h); c.fillStyle = '#e8d8a8'; for (let i = 0; i < 5; i++) c.fillRect(x + 6 + (i % 3) * 22, y + 6 + Math.floor(i / 3) * 18, 16, 12); break;
    case 'bench': c.fillStyle = '#6a4a30'; c.fillRect(x, y, w, 8); break;
    case 'vj': c.fillStyle = '#20202c'; c.fillRect(x, y, w, h); c.fillStyle = `hsl(${vjHue},90%,60%)`; c.fillRect(x + 4, y + 4, w - 8, 8); break;
    case 'warehouse': c.fillStyle = '#5a3a2f'; c.fillRect(x, y, w, h); c.fillStyle = '#7a5040'; for (let i = 0; i < h; i += 8) c.fillRect(x, y + i, w, 2); c.fillStyle = '#ff2d78'; c.fillRect(x + 8, y + 8, w - 16, 3); c.fillStyle = '#00f3ff'; c.fillRect(x + 8, y + 16, w - 16, 2); c.fillStyle = '#fff'; c.font = '8px monospace'; c.fillText('THE COMPLEX', x + w / 2 - 28, y + 32); break;
    case 'orb': c.fillStyle = `hsl(${(time * 40) % 360},90%,${55 + beat() * 15}%)`; c.beginPath(); c.arc(x + w / 2, y + h / 2 - Math.sin(time * 2) * 3, 14 + beat() * 2, 0, 7); c.fill(); break;
    case 'sign': c.fillStyle = '#20202c'; c.fillRect(x, y, w, h); c.fillStyle = '#fec837'; c.font = '7px monospace'; c.fillText(p.text, x + 3, y + h / 2 + 3); break;
    case 'cabinet': c.fillStyle = p.color; c.fillRect(x, y, w, h); c.fillStyle = '#05050e'; c.fillRect(x + 6, y + 6, w - 12, 18); c.fillStyle = '#fff'; c.fillRect(x + 10, y + 10 + (Math.floor(time * 3) % 2) * 3, 6, 4); break;
    case 'paw': c.fillStyle = '#5a3a20'; c.fillRect(x, y + 8, w, h - 8); c.fillStyle = '#c8a070'; c.fillRect(x + 6, y, 20, 14); break;
    case 'hoop': c.fillStyle = '#fff'; c.fillRect(x, y, w, 20); c.fillStyle = '#ff6b35'; c.fillRect(x + 6, y + 22, w - 12, 4); c.fillStyle = '#525162'; c.fillRect(x + w / 2 - 2, y + 26, 4, h - 26); break;
    case 'gallery': c.fillStyle = '#7a1a3a'; c.fillRect(x, y, w, h); c.fillStyle = '#fec837'; for (let i = 0; i < 3; i++) c.fillRect(x + 8 + i * 18, y + 8, 12, 12); break;
    case 'tank': c.fillStyle = '#2d6a9a'; c.fillRect(x, y + 12, w, h - 12); c.fillStyle = '#5aa0d0'; c.fillRect(x + 4, y + 20, w - 8, h - 28); c.fillStyle = '#ff0055'; c.fillRect(x + w - 14, y, 10, 14); break;
    case 'screen': c.fillStyle = '#0b0e18'; c.fillRect(x, y, w, h); c.fillStyle = `hsl(${(time * 50) % 360},70%,45%)`; c.fillRect(x + 6, y + 6, w - 12, h - 12); break;
    case 'seat': c.fillStyle = '#7a2a3a'; c.fillRect(x, y, w, h + 6); break;
  }
}
function drawPerson(p) {
  const x = Math.round(p.x - 6), y = Math.round(p.y - 14), f = Math.floor(p.step) % 2, st = p.style, c = ctx;
  c.fillStyle = '#0006'; c.fillRect(x + 1, y + 16, 10, 3);
  const skin = st === 'vapor' ? '#c8d8e8' : st === 'marshmallow' ? '#fff5e0' : '#e8c39e';
  c.fillStyle = skin; c.fillRect(x + 2, y, 8, 7);
  c.fillStyle = st === 'cowboy' ? '#6a4020' : st === 'hooded' ? '#2a2a4a' : '#2b2233'; c.fillRect(x + 2, y - 1, 8, 3);
  if (st === 'cowboy') c.fillRect(x - 1, y + 1, 14, 2);
  c.fillStyle = p.accent || p.color; c.fillRect(x + 1, y + 7, 10, 6);
  if (st === 'marshmallow') { c.fillStyle = '#d9a25a'; c.fillRect(x + 2, y + 1, 8, 3); }
  c.fillStyle = st === 'cowboy' ? '#2a4a8a' : '#242038'; c.fillRect(x + 2, y + 13 + (f ? 0 : 1), 3, 3); c.fillRect(x + 7, y + 13 + (f ? 1 : 0), 3, 3);
  if (st === 'raver') { c.fillStyle = '#00f3ff'; c.fillRect(x + 2, y + 3, 8, 2); }
  else if (st === 'vapor') { c.fillStyle = '#111'; c.fillRect(x + 2, y + 3, 8, 2); }
  else if (st === 'glitch') { c.fillStyle = '#ff0055'; c.fillRect(x + 4, y + 2, 8, 6); c.fillStyle = '#00f3ff'; c.fillRect(x, y + 2, 4, 6); }
  else if (p.dir !== 1) { c.fillStyle = '#000'; c.fillRect(x + (p.dir === 2 ? 3 : p.dir === 3 ? 7 : 4), y + 4, 1, 1); if (p.dir < 2) c.fillRect(x + 7, y + 4, 1, 1); }
  if (st === 'hooded') { c.fillStyle = '#6a6cff'; c.fillRect(x + 2, y - 6, 8, 3); }
}
function bubble(p) { if (!p.sayT) return; ctx.font = '8px monospace'; const w = Math.ceil(ctx.measureText(p.say).width) + 6, x = Math.round(p.x - w / 2), y = Math.round(p.y - 30); ctx.fillStyle = '#fff'; ctx.fillRect(x, y, w, 11); ctx.fillRect(Math.round(p.x) - 1, y + 11, 3, 2); ctx.fillStyle = '#141824'; ctx.fillText(p.say, x + 3, y + 8); }
function nameTag(p) { ctx.font = '7px monospace'; const w = ctx.measureText(p.name).width; ctx.fillStyle = '#000a'; ctx.fillRect(Math.round(p.x - w / 2 - 2), Math.round(p.y + 6), w + 4, 9); ctx.fillStyle = p === me ? '#fec837' : '#fff'; ctx.fillText(p.name, Math.round(p.x - w / 2), Math.round(p.y + 13)); }
function draw() {
  const s = scale(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false; ctx.fillStyle = '#0b0e18'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(s, 0, 0, s, -Math.round(cam.x * s), -Math.round(cam.y * s));
  const x0 = Math.max(0, Math.floor(cam.x / T)), y0 = Math.max(0, Math.floor(cam.y / T)), x1 = Math.min(scene.w, Math.ceil((cam.x + cv.width / s) / T)), y1 = Math.min(scene.h, Math.ceil((cam.y + cv.height / s) / T));
  for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) drawTile(scene.tiles[j][i], i * T, j * T, i, j);
  const npcs = scene.npcs.map(n => ({ ...n, x: n.tx * T + T / 2, y: n.ty * T + T, step: time * 3 * (n.style === 'plain' ? 0 : 1), dir: 0 }));
  const items = [...scene.props.map(p => ({ prop: p, y: (p.y + p.h) * T })), ...[me, ...crowd, ...npcs].map(p => ({ person: p, y: p.y }))].sort((a, b) => a.y - b.y);
  scene.props.filter(p => p.type === 'led' || p.type === 'screen' || p.type === 'sun' || p.type === 'sign').forEach(drawProp);
  items.forEach(i => { if (i.prop) { if (!['led', 'screen', 'sun', 'sign'].includes(i.prop.type)) drawProp(i.prop); } else { const p = i.person; if (p.fixed || p.style !== 'plain') p.step = Math.floor(time * 3); drawPerson(p); } });
  [me, ...crowd, ...npcs].forEach(nameTag); [me, ...crowd].forEach(bubble);
  if (near) { ctx.strokeStyle = '#fec837'; ctx.lineWidth = 1; ctx.strokeRect(near.x * T - 2, near.y * T - 2, T + 4, T + 4); }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (scene.id === 'festival') { const dayT = (time / 120) % 1; ctx.fillStyle = `rgba(8,10,40,${.34 + .18 * Math.sin(dayT * 6.28)})`; ctx.fillRect(0, 0, cv.width, cv.height); }
  if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash})`; ctx.fillRect(0, 0, cv.width, cv.height); }
  if (mg) { mg.draw(mx); }
}

/* ---------- boot ---------- */
let last = performance.now();
function resize() { cv.width = innerWidth; cv.height = innerHeight; } addEventListener('resize', resize); resize();
function loop(now) { const dt = Math.min(.05, (now - last) / 1000); last = now; if (started) update(dt); else { time += dt; cam.x = 30 * T; cam.y = 0; } draw(); requestAnimationFrame(loop); }
requestAnimationFrame(loop);
if (location.hash === '#debug') window.__mf = { enter, W, me, interact: () => interact(), get scene() { return scene.id; }, get near() { return near && near.id; } };
COLORS.forEach((c, i) => { const b = document.createElement('button'); b.type = 'button'; b.style.background = c; b.setAttribute('role', 'radio'); b.setAttribute('aria-label', 'Colour ' + (i + 1)); b.setAttribute('aria-checked', i === 0); b.onclick = () => { me.color = c; [...$('swatches').children].forEach(x => x.setAttribute('aria-checked', x === b)); }; $('swatches').append(b); });
$('name').value = store.get('mf.name') || '';
$('join').onsubmit = e => { e.preventDefault(); me.name = $('name').value.trim() || 'wanderer'; store.set('mf.name', me.name); $('join').remove(); ['hud', 'log'].forEach(id => { $(id).hidden = false; }); started = true; startAudio(); enter(W.F, W.F.spawn[0], W.F.spawn[1]); speak(me, 'made it'); };
})();
