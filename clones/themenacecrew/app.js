(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const el = (t, p = {}, kids = []) => { const n = Object.assign(document.createElement(t), p); kids.forEach(k => n.append(k)); return n; };
const store = { get(k){ try { return localStorage.getItem(k); } catch { return null; } }, set(k,v){ try { localStorage.setItem(k,v); } catch { /* storage unavailable */ } } };

/* ---------- sound ---------- */
let soundOn = true, actx = null;
function beep(freq = 440, dur = .08, type = 'square', vol = .05) {
  if (!soundOn) return;
  const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
  actx = actx || new C(); if (actx.state === 'suspended') actx.resume();
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.value = freq; g.gain.value = vol;
  g.gain.exponentialRampToValueAtTime(.0001, actx.currentTime + dur);
  o.connect(g).connect(actx.destination); o.start(); o.stop(actx.currentTime + dur);
}

/* ---------- content (placeholder — swap in your own) ---------- */
const readme = `<div class="doc"><h1>README.TXT</h1>
<p>Welcome to <b>MENACE OS 98</b> — a fan-built rebuild of a Windows 98 style homepage.</p>
<blockquote>Everything here is placeholder content. Replace the text, links and merch with your own.</blockquote>
<h2>How to use</h2><p>Double-click icons. Drag windows by the title bar. Try the Start menu, the CRT and sound toggles, and the arcade.</p></div>`;
const wiki = `<div class="doc"><h1>Wiki</h1><p>Lore pages go here.</p><h2>Characters</h2><p>Add a list of characters, running gags and episodes.</p><h2>Timeline</h2><p>Add a timeline of events.</p></div>`;
const links = [['Live stream','#'],['Video vault','#'],['Support','#'],['Merch','#']];
const merch = [['Logo Tee','🎽','$25'],['Crew Hoodie','🧥','$55'],['Sticker Pack','🏷️','$6'],['Mug','☕','$14'],['Cap','🧢','$22'],['Poster','🖼️','$18']];
const sounds = [['AIRHORN',880,'sawtooth'],['COIN',1320,'square'],['BOOM',80,'sawtooth'],['CROAK',180,'triangle'],['WOMP',150,'sine'],['DIAL-UP',600,'square']];
const ads = [['YOU ARE THE 1,000,000th VISITOR','Click here to claim absolutely nothing.'],['DOWNLOAD MORE RAM','Now with 40% more RAM.'],['SPYWARE REMOVER 98','Found 3,412 threats. (Satire.)']];

/* ---------- windows ---------- */
const layer = $('#windows'), tasks = $('#tasks');
const open = new Map(); let z = 10, offset = 0;

function focusWin(w) { open.forEach(o => { o.win.classList.toggle('active', o === w); o.task.setAttribute('aria-pressed', o === w); }); w.win.style.zIndex = ++z; }

function openApp(app) {
  if (open.has(app.id)) { const o = open.get(app.id); o.win.hidden = false; focusWin(o); return; }
  const win = el('section', { className: 'win opening', role: 'dialog', ariaLabel: app.title });
  const close = el('button', { className: 'title-btn', textContent: '×', ariaLabel: 'Close' });
  const max = el('button', { className: 'title-btn', textContent: '□', ariaLabel: 'Maximize' });
  const min = el('button', { className: 'title-btn', textContent: '_', ariaLabel: 'Minimize' });
  const bar = el('div', { className: 'titlebar' }, [el('span', { textContent: app.icon }), el('span', { className: 'title', textContent: app.title }), min, max, close]);
  const body = el('div', { className: 'body' + (app.flush ? ' flush' : '') });
  win.append(bar, body);
  if (app.status) win.append(el('div', { className: 'status' }, [el('span', { textContent: app.status })]));
  const w = Math.min(app.w || 420, innerWidth - 8);
  offset = (offset + 26) % 130;
  Object.assign(win.style, { width: w + 'px', left: Math.max(4, 90 + offset + (app.dx || 0)) + 'px', top: 20 + offset + 'px', maxHeight: 'calc(100% - 30px)' });
  layer.append(win);
  const task = el('button', { className: 'btn task', textContent: app.icon + ' ' + app.title.split(' — ')[0], ariaPressed: 'true' });
  tasks.append(task);
  const o = { win, task, app };
  open.set(app.id, o);
  app.render(body, o);
  beep(660, .05);
  const kill = () => { app.dispose && app.dispose(); win.remove(); task.remove(); open.delete(app.id); beep(300, .06); };
  close.onclick = kill;
  min.onclick = () => { win.hidden = true; task.setAttribute('aria-pressed', 'false'); };
  max.onclick = () => win.classList.toggle('max');
  task.onclick = () => { if (win.hidden || !win.classList.contains('active')) { win.hidden = false; focusWin(o); } else min.onclick(); };
  win.addEventListener('pointerdown', () => focusWin(o));
  bar.addEventListener('dblclick', e => { if (e.target === bar || e.target.classList.contains('title')) max.onclick(); });
  drag(win, bar);
  focusWin(o);
}

function drag(win, handle) {
  handle.addEventListener('pointerdown', e => {
    if (e.target.closest('button') || win.classList.contains('max')) return;
    const r = win.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
    handle.setPointerCapture(e.pointerId);
    const move = ev => { win.style.left = Math.max(-r.width + 60, Math.min(innerWidth - 60, ev.clientX - dx)) + 'px'; win.style.top = Math.max(0, Math.min(innerHeight - 80, ev.clientY - dy)) + 'px'; };
    const up = () => { handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up); };
    handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', up);
  });
}

/* ---------- apps ---------- */
function soundboard(body) {
  body.append(el('div', { className: 'grid' }, sounds.map(([n, f, t]) => el('button', { className: 'btn big', textContent: n, style: 'padding:14px 6px', onclick: () => beep(f, .35, t, .12) }))));
}

function merchApp(body) {
  body.append(el('div', { className: 'grid' }, merch.map(([n, i, p]) => el('a', { className: 'card bevel-out', href: '#', onclick: e => { e.preventDefault(); beep(880, .06); } }, [el('div', { className: 'thumb bevel-in', textContent: i }), el('b', { textContent: n }), el('span', { textContent: p })]))));
}

function tv(body) {
  body.append(el('div', { className: 'stack' }, [
    el('div', { className: 'bevel-in', style: 'aspect-ratio:16/9;background:#000;display:grid;place-items:center;color:var(--lime);font:12px monospace' }, [el('span', { textContent: 'NO SIGNAL — embed your stream player here' })]),
    el('div', { className: 'row' }, [el('span', { className: 'led' }), el('b', { textContent: 'LIVE FEED' }), ...links.map(([n, h]) => el('a', { href: h, textContent: n }))])
  ]));
}

function arcade(body) {
  body.append(el('div', { className: 'stack' }, [el('h2', { className: 'pixel-title', textContent: 'ARCADE' }), el('p', { textContent: 'Pick a toy.' }), el('div', { className: 'row' }, [el('button', { className: 'btn big', textContent: '📢 Soundboard', onclick: () => openApp(APPS.sound) })])]));
}

function recycle(body) { body.append(el('div', { className: 'doc' }, [el('p', { textContent: 'Empty. (Nothing to see. Move along.)' })])); }

const html = s => (b) => { b.classList.add('flush'); b.innerHTML = s; };
const APPS = {
  readme: { id: 'readme', title: 'README.TXT — Notepad', icon: '📄', w: 460, render: html(readme) },
  wiki: { id: 'wiki', title: 'Wiki', icon: '📚', w: 520, render: html(wiki), status: 'Placeholder lore' },
  arcade: { id: 'arcade', title: 'Arcade', icon: '🕹️', w: 360, render: arcade },
  sound: { id: 'sound', title: 'SOUNDBOARD.EXE', icon: '📢', w: 380, render: soundboard },
  merch: { id: 'merch', title: 'MERCH.EXE', icon: '🛍️', w: 520, render: merchApp, status: 'Placeholder products' },
  tv: { id: 'tv', title: 'MENACE_TV.EXE', icon: '📺', w: 520, render: tv },
  bin: { id: 'bin', title: 'Recycle Bin', icon: '🗑️', w: 300, render: recycle }
};
const iconList = ['readme', 'wiki', 'arcade', 'merch', 'tv', 'sound', 'bin'];

iconList.forEach(id => {
  const a = APPS[id];
  $('#icons').append(el('button', { className: 'desktop-icon', ondblclick: () => openApp(a), onkeydown: e => { if (e.key === 'Enter') openApp(a); }, onclick: () => { if (matchMedia('(pointer:coarse)').matches) openApp(a); } }, [el('span', { className: 'icon-art', textContent: a.icon }), el('span', { className: 'icon-label', textContent: a.title.split(' — ')[0] })]));
});

/* ---------- start menu, tray ---------- */
const menu = $('#startMenu'), startBtn = $('#startBtn');
[...iconList.filter(i => i !== 'bin').map(i => APPS[i]), null, { title: 'Shut Down…', icon: '⏻', render: 0, act: () => { document.body.innerHTML = '<div style="position:fixed;inset:0;background:#000;color:#ff9a00;display:grid;place-items:center;font:16px monospace">It\'s now safe to turn off your computer.<br>(Reload to boot again.)</div>'; } }].forEach(a => {
  $('#startItems').append(a ? el('button', { className: 'start-item', onclick: () => { menu.hidden = true; a.act ? a.act() : openApp(a); } }, [el('span', { textContent: a.icon }), a.title.split(' — ')[0]]) : el('div', { className: 'sep' }));
});
const toggleMenu = v => { menu.hidden = v ?? !menu.hidden; startBtn.setAttribute('aria-expanded', !menu.hidden); startBtn.setAttribute('aria-pressed', !menu.hidden); };
startBtn.onclick = e => { e.stopPropagation(); toggleMenu(); };
document.addEventListener('pointerdown', e => { if (!menu.contains(e.target) && e.target !== startBtn) toggleMenu(true); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') toggleMenu(true); });

$('#crtBtn').onclick = e => { const on = document.body.classList.toggle('crt'); e.currentTarget.setAttribute('aria-pressed', on); store.set('mos.crt', on ? 1 : 0); };
$('#sndBtn').onclick = e => { soundOn = !soundOn; e.currentTarget.setAttribute('aria-pressed', soundOn); store.set('mos.snd', soundOn ? 1 : 0); };
if (store.get('mos.crt') === '0') { document.body.classList.remove('crt'); $('#crtBtn').setAttribute('aria-pressed', false); }
if (store.get('mos.snd') === '0') { soundOn = false; $('#sndBtn').setAttribute('aria-pressed', false); }
const tick = () => { $('#clock').textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); };
tick(); setInterval(tick, 20000);

/* ---------- satire popup ads ---------- */
function popAd() {
  const [t, msg] = ads[Math.random() * ads.length | 0];
  const id = 'ad' + Date.now();
  openApp({ id, title: t, icon: '⚠️', w: 280, dx: 200, render: b => b.append(el('div', { className: 'stack' }, [el('p', { textContent: msg }), el('button', { className: 'btn', textContent: 'OK', onclick: () => open.get(id)?.win.querySelector('[aria-label=Close]').click() })])) });
}

/* ---------- boot ---------- */
const boot = $('#boot');
const lines = ['<span class="logo">MENACE BIOS v9.8</span>', 'Memory test ........ <span class="ok">640K OK</span>', 'Detecting drives ... <span class="ok">OK</span>', 'Loading MENACE OS 98 ...', '', 'Press any key to skip<span class="cur">_</span>'];
let bi = 0, bt;
function endBoot() { clearInterval(bt); boot.remove(); openApp(APPS.readme); setTimeout(popAd, 9000); }
if (store.get('mos.booted') || matchMedia('(prefers-reduced-motion:reduce)').matches) endBoot();
else { store.set('mos.booted', 1); bt = setInterval(() => { boot.innerHTML = lines.slice(0, ++bi).join('\n'); if (bi >= lines.length) { clearInterval(bt); setTimeout(endBoot, 700); } }, 350); ['keydown', 'pointerdown'].forEach(ev => boot.addEventListener(ev, endBoot, { once: true })); addEventListener('keydown', endBoot, { once: true }); }
})();
