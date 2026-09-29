// World graph. Every map is a real top-down render of the festival repo's own
// 3D scenes (roofs and ceilings off), with collision footprints read from the
// scene geometry (see maps.js). Coordinates are the repo's world units.
window.WORLD = (() => {
  const M = window.MAPS, CELL = M.festival.cell, worlds = {};
  const st = (id, label, x, z, extra = {}) => ({ id, label, x, z, ...extra });
  const decode = m => { const g = new Uint8Array(m.gw * m.gh); m.grid.forEach((row, j) => { let i = 0; row.split(',').forEach(t => { const v = +t[0], n = +t.slice(1); if (v) g.fill(1, j * m.gw + i, j * m.gw + i + n); i += n; }); }); return g; };
  const carve = (w, x, z, r) => { const c = Math.ceil(r / CELL); const ci = Math.floor((x - w.frame[0]) / CELL), cj = Math.floor((z - w.frame[1]) / CELL); for (let j = cj - c; j <= cj + c; j++) for (let i = ci - c; i <= ci + c; i++) if (i >= 0 && j >= 0 && i < w.gw && j < w.gh && Math.hypot((i - ci) * CELL, (j - cj) * CELL) <= r) w.grid[j * w.gw + i] = 0; };
  // Anything walled in by an over-broad footprint gets a one-cell-wide path to the open floor.
  const connect = w => {
    const idx = (x, z) => Math.floor((z - w.frame[1]) / CELL) * w.gw + Math.floor((x - w.frame[0]) / CELL), N = w.gw * w.gh;
    const flood = () => { const seen = new Uint8Array(N), q = [idx(...w.arrive)]; seen[q[0]] = 1; while (q.length) { const c = q.pop(), i = c % w.gw, j = (c - i) / w.gw; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = i + a, y = j + b; if (x < 0 || y < 0 || x >= w.gw || y >= w.gh) continue; const n = y * w.gw + x; if (!seen[n] && !w.grid[n]) { seen[n] = 1; q.push(n); } } } return seen; };
    let seen = flood();
    [...w.stations, ...w.doors].forEach(t => {
      const start = idx(t.x, t.z); if (start < 0 || start >= N || seen[start]) return;
      const prev = new Int32Array(N).fill(-1); prev[start] = start; const q = [start]; let hit = -1;
      for (let h = 0; h < q.length && hit < 0; h++) { const c = q[h], i = c % w.gw, j = (c - i) / w.gw; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = i + a, y = j + b; if (x < 0 || y < 0 || x >= w.gw || y >= w.gh) continue; const n = y * w.gw + x; if (prev[n] < 0) { prev[n] = c; if (seen[n]) { hit = n; break; } q.push(n); } } }
      for (let c = hit; hit >= 0 && c !== start; c = prev[c]) w.grid[c] = 0;
      seen = flood();
    });
  };
  const make = (id, name, o = {}) => { const m = M[id]; const w = { id, name, frame: m.frame, gw: m.gw, gh: m.gh, cell: CELL, grid: decode(m), stations: [], doors: [], zones: [], spawn: null, blurb: '', ...o }; worlds[id] = w; return w; };
  const finish = w => {
    if (!w.spawn) { const cx = w.frame[0] + w.frame[2] / 2; let best = null; for (let z = w.frame[1] + w.frame[3] - 2; z > w.frame[1]; z -= 1) for (let d = 0; d < w.frame[2] / 2; d += 1) for (const s of [d, -d]) { const x = cx + s; const i = Math.floor((x - w.frame[0]) / CELL), j = Math.floor((z - w.frame[1]) / CELL); if (!w.grid[j * w.gw + i] && !best) best = [x, z]; } w.spawn = best || [cx, w.frame[1] + w.frame[3] / 2]; }
    const [sx, sz] = w.spawn;
    if (w.exit) { const cx = w.frame[0] + w.frame[2] / 2, cz = w.frame[1] + w.frame[3] / 2, L = Math.hypot(cx - sx, cz - sz) || 1; w.arrive = [sx + (cx - sx) / L * 3.5, sz + (cz - sz) / L * 3.5]; w.doors.push({ x: sx, z: sz, r: 1.6, exit: true, label: 'Leave' }); } else w.arrive = w.spawn;
    carve(w, sx, sz, 3.5); carve(w, w.arrive[0], w.arrive[1], 2);
    w.doors.forEach(d => carve(w, d.x, d.z, d.r + .6)); w.stations.forEach(s => carve(w, s.x, s.z, 1.3));
    connect(w);
    return w;
  };
  const kindText = { person: null, epk: 'The press-kit screen. In the original world it opens the EPK.', structure: 'A set piece in this world.', landmark: 'A landmark in this world.', game: 'A game spot in this world.' };
  const artist = (id, name, blurb, spawn, items) => { const w = make(id, name, { blurb, spawn, exit: true }); items.forEach(([k, label, x, z]) => w.stations.push(st(id + ':' + label, label, x, z, { kind: k }))); return finish(w); };

  /* ---------- artist worlds (items from the festival repo's worldmaps.js) ---------- */
  artist('ravecharles', 'Rave Charles — neon mosh pit', 'A rave stage with the tour-timeline EPK, the LED-visor mask monument, and the tour road.', [0, 12], [['person', 'Rave Charles figure', 0, -8], ['epk', 'Stage screen — EPK', 0, -25.4], ['structure', 'LED-visor mask monument', -18, 0], ['landmark', 'Tour road', 18, -6]]);
  artist('sofaboi', 'Sofa King Sad Boi — couch kingdom', 'A throne of couches, a sea of sofas under the rain, and a sub-heavy bass pit.', [0, 15], [['epk', 'Sofa throne + EPK TV', 0, -18], ['structure', 'Bass pit — sub stack', 13, -7], ['structure', 'Bass pit — sub stack ', 13, 7], ['structure', 'Bass pit — sub stack  ', 23, -7], ['structure', 'Bass pit — sub stack   ', 23, 7]]);
  artist('driftwave', 'DriftWave Static — vaporwave dreamscape', 'Temple, mallsoft and a lo-fi nook, plus the parkour spiral and the ring-runner glide course.', [0, 15], [['person', 'DriftWave figure', 0, 1], ['epk', 'Temple monolith — EPK', 0, -8], ['structure', 'Lo-fi nook', -20, 2], ['structure', 'DreamOS workstation', -14, 7], ['structure', 'Deadnet portal', 21, 11], ['game', 'Parkour spiral', 16, -6]]);
  artist('glitch', '12matt3r — glitch CRT room', 'A stacked-CRT monument in the centre, glitch dressing all around, and a laser grid guarding the exit portal.', [0, 12], [['structure', 'Stacked-CRT monument', 0, 0], ['epk', 'Big CRT — EPK (web-OS)', 0, 4.4], ['person', '12matt3r figure', 9, 8], ['structure', 'Workstation', 14, 4], ['landmark', 'Exit portal', -16, 4], ['game', 'Laser grid', -10, 2]]);
  artist('tanky', 'Tanky Johnson — cosmic western', 'A saloon with the jukebox EPK, a tailgate truck and bonfire, and a void desert of mesas and cacti.', [0, 14], [['person', 'Tanky Johnson figure', 12, 8], ['structure', 'Saloon', 0, -20], ['epk', 'Jukebox — EPK', 4.5, -13.8]]);
  artist('shmorez', 'Shmorez — s’mores campground', 'A bonfire camp, a giant s’more, graham-cracker platforms and marshmallow boulders, ringed by pines.', [0, 13], [['person', 'Shmorez figure', 4, 2], ['epk', 'Visuals screen — EPK', 0, -20], ['structure', 'Giant s’more', -18, -13]]);

  /* ---------- rooms reached from The Complex ---------- */
  const room = (id, name, blurb, extra = []) => { const w = make(id, name, { blurb, exit: true }); extra.forEach(([label, x, z]) => w.stations.push(st(id + ':' + label, label, x, z, { kind: 'structure' }))); return finish(w); };
  room('horrorcore', 'Horrorcore chamber', 'A blood-red room off the hub. Enter if you dare.');
  room('abstract', 'Abstract chamber', 'A spiral of colour with a little vehicle parked in it.');
  room('hidden', 'The Hidden Room', 'Behind the heart of the hub. Seven glowing sigils circle a golden sun.');
  room('rooftop', 'The Rooftop', 'The far end of the room loop, floating above the void.');
  room('lofi', 'Lo-fi room', 'A striped room of cloud lamps and a stepped rug.');
  room('vj', 'VJ · Stage', 'A rig of screens over a floor of speakers. This one drives the festival screens.');
  room('builder', 'Room Builder', 'A purple studio floor. Build a room here.');
  room('museum', 'The Gallery', 'A long, quiet marble gallery of framed pictures.');
  room('tv', 'Dream OS · Theater', 'Rows of seats facing the big screen.');
  room('store', 'The Merch Boutique', 'A walk-in hall hung with the whole store drop.');
  room('gamecity', 'The Block', 'Street games, a racetrack and a beach on the east edge.');
  room('vaporrooms', 'Vapor rooms', 'Three rooms in a row: brown, white and lounge.');

  /* ---------- The Midway (arcade tent) ---------- */
  const mid = make('arcade', 'The Midway', { blurb: 'Every game under one big top.', spawn: [0, 11], exit: true });
  [[-10, -6, 'cab-flash', 'Flash portal cabinet'], [-6, -8, 'cab-wake', 'Wake Up cabinet'], [6, -8, 'cab-games', 'Games cabinet'], [10, -6, 'cab-stories', 'Stories cabinet'], [0, -10, 'dodge', 'DODGE HELL cabinet'], [0, -6, 'paw', "The Monkey's Paw"], [-9, 4, 'hoops', 'Basketball hoop'], [9, 4, 'gallery', 'Shooting gallery'], [0, 6, 'dunk', 'Dunk tank']].forEach(([x, z, id, label]) => mid.stations.push(st(id, label, x, z + 2.2)));
  finish(mid);

  /* ---------- The Complex (warehouse hub) ---------- */
  const cx = make('complex', 'The Complex', { blurb: 'The immersive complex. The hub is behind the warehouse; the wall of room doors is behind you.', spawn: [0, 40] });
  cx.zones = [[-30, -20, 60, 40, 'Central hub'], [-30, 20, 60, 28, 'Entrance street']];
  const walk = (label, x, z, to, r = 1.7) => cx.doors.push({ x, z: z - 2.6, r, to, label });
  [[-23, 'tv', 'Dream OS · Theater'], [-17.9, 'vj', 'VJ · Stage'], [-7.7, 'museum', 'The Gallery'], [-2.6, 'arcade', 'Arcade + Karaoke'], [2.6, 'gamecity', 'The Block'], [23, 'builder', 'Room Builder']].forEach(([x, to, label]) => walk(label, x, 53.5, to));
  [[-12.8, 'THE ROOMS', 'The big loop starts here.'], [7.7, 'OPEN CITY', 'A free-roam driving sim.'], [12.8, 'BRIDGE HORROR HOUSE', 'Enter if you dare.'], [17.9, 'LINKS · ALL PROJECTS', 'Every alias, app and social.']].forEach(([x, label, text]) => cx.stations.push(st('cx:' + label, label, x, 50.9, { text: label + ' — ' + text + ' This one is a separate page in the original and is not built into this map.' })));
  cx.doors.push({ x: 30, z: 40, r: 2.2, to: 'rooftop', label: 'The Rooms (far end)' });
  cx.stations.push(st('cx:rooms-west', 'THE ROOMS ▸', -29, 40, { text: 'The start of the room loop. It is a separate page in the original and is not built into this map.' }));
  cx.doors.push({ x: 0, z: -22.6, r: 1.8, to: 'hidden', label: 'The Hidden Room' });
  [[-23, 0, 'glitch', 'Glitch chamber'], [-23, -14, 'horrorcore', 'Horrorcore chamber'], [23, -9, 'abstract', 'Abstract chamber']].forEach(([x, z, to, label]) => cx.stations.push(st('cx:' + to, label, x, z, { enter: to })));
  cx.stations.push(st('cx:arcade', 'Arcade chamber', 23, -1, { enter: 'arcade' }), st('cx:theater', 'Festival · Theater chamber', 23, -17, { text: 'A velvet arch, amber spotlights, a stage and a big screen. Nothing is playing right now.' }));
  cx.stations.push(st('cx:exit', 'Exit to the festival', 0, 43.5, { enter: 'festival', exitTo: true }));
  cx.stations.push(st('orb', 'The heart', 0, 4, { text: 'A levitating orb, the heart of the hub. Behind it is a hidden door.' }));
  finish(cx);

  /* ---------- Festival grounds ---------- */
  const f = make('festival', 'Festival grounds', { spawn: [-18, 18] });
  f.zones = [[-9, -21, 18, 13, 'THE PIT'], [-15, -28, 30, 9, 'MAIN STAGE'], [19, -7, 8, 9, 'THE COMPLEX'], [21, -16, 12, 12, 'THE MIDWAY']];
  [['decks', 'The Decks', 0, -22], ['ravecharles', 'RAVE CHARLES', 0, -16, 'ravecharles'], ['studio', '12MATT3R', 0, -6, 'glitch'], ['driftwave', 'DRIFTWAVE STATIC', 0, 3, 'driftwave'], ['sofaboi', 'SOFA KING SAD BOI', 11, -6, 'sofaboi'], ['tanky', 'TANKY JOHNSON', 11, 7, 'tanky'], ['shmorez', 'SHMOREZ', 14, 17, 'shmorez'],
   ['merch', 'The Merch Tent', -24.5, 4, 'store'], ['kiosk', 'Tools kiosk', -24.5, -1], ['lounge', 'The Lounge', -24.5, 11], ['dealer', 'Props dealer', -13, -13], ['vault', 'Backstage vault', -15, -20], ['keycard', 'Hidden keycard', 22, 20], ['porta', "Porta John's", 24, 10], ['lab', 'The Lab', 0, 22], ['booth', 'Photo booth', -6, 21], ['board', 'Message board', -14, 20], ['bench', 'Park bench', -10, 20], ['vj', 'VJ board', 5, 18]]
    .forEach(([id, label, x, z, enter]) => f.stations.push(st(id, label, x, z, enter ? { enter } : {})));
  f.doors.push({ x: 18.4, z: -2.2, r: 1.8, to: 'complex', label: 'Enter The Complex' }, { x: 20.4, z: -10, r: 1.8, to: 'arcade', label: 'Enter The Midway' });
  finish(f);
  return { worlds, order: Object.keys(worlds) };
})();
