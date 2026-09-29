// ONE continuous campus. Every room is an overhead render of the festival repo's
// own 3D scene (roofs off), laid out on a shared grid and joined by roads, so you
// walk from the festival into the Complex, out along the avenues to every room.
window.WORLD = (() => {
  const M = window.MAPS, CELL = 0.5, ROAD = 4;
  const BASE = 'https://hungryshmorez.github.io/Site/';
  const MEDIA = 'https://hungryshmorez.github.io/Media/music/';
  const L = (t, u) => ({ t, u });
  const page = (t, p) => L(t, BASE + p);
  const st = (id, label, x, z, extra = {}) => ({ id, label, x, z, ...extra });
  const decode = m => { const g = new Uint8Array(m.gw * m.gh); m.grid.forEach((row, j) => { let i = 0; row.split(',').forEach(t => { const v = +t[0], n = +t.slice(1); if (v) g.fill(1, j * m.gw + i, j * m.gw + i + n); i += n; }); }); return g; };

  const NAMES = { festival: 'Festival grounds', complex: 'The Complex', arcade: 'The Midway', gamecity: 'The Block', store: 'The Merch Boutique', tanky: 'Tanky Johnson — cosmic western', ravecharles: 'Rave Charles — neon mosh pit', shmorez: 'Shmorez — s’mores campground', driftwave: 'DriftWave Static — vaporwave dreamscape', sofaboi: 'Sofa King Sad Boi — couch kingdom', hidden: 'The Hidden Room', abstract: 'Abstract chamber', rooftop: 'The Rooftop', vaporrooms: 'Vapor rooms', lofi: 'Lo-fi room', glitch: '12matt3r — glitch CRT room', vj: 'VJ · Stage', museum: 'The Gallery', horrorcore: 'Horrorcore chamber', tv: 'Dream OS · Theater', builder: 'Room Builder' };
  const shelfOrder = ['gamecity', 'store', 'tanky', 'ravecharles', 'shmorez', 'driftwave', 'sofaboi', 'hidden', 'abstract', 'rooftop', 'vaporrooms', 'lofi', 'glitch', 'vj', 'museum', 'horrorcore', 'tv', 'builder'];
  const doorXs = [-23, -17.9, -12.8, -7.7, -2.6, 2.6, 7.7, 12.8, 17.9, 23];

  /* ---------- area builder: chunks + roads + stations on one shared collision grid ---------- */
  function buildArea(id, name, placements, spawn) {
    const A = { id, name, chunks: [], off: {}, roads: [], stations: [], portals: [], spawn, cell: CELL, unreachable: [] };
    placements.forEach(([cid, ox, oz]) => { const f = M[cid].frame; A.off[cid] = [ox, oz]; A.chunks.push({ id: cid, name: NAMES[cid], ox, oz, frame: [f[0] + ox, f[1] + oz, f[2], f[3]] }); });
    A.at = (cid, x, z) => [x + A.off[cid][0], z + A.off[cid][1]];
    A.hRoad = (x1, x2, z) => A.roads.push({ x: Math.min(x1, x2), z: z - ROAD / 2, w: Math.abs(x2 - x1), h: ROAD });
    A.vRoad = (x, z1, z2) => A.roads.push({ x: x - ROAD / 2, z: Math.min(z1, z2), w: ROAD, h: Math.abs(z2 - z1) });
    A.poly = pts => { for (let i = 1; i < pts.length; i++) { const [a, b] = [pts[i - 1], pts[i]]; if (a[1] === b[1]) A.hRoad(a[0], b[0], a[1]); else A.vRoad(a[0], a[1], b[1]); } };
    A.add = (sid, o) => { const s = st(o.sid || sid, o.label, o.x, o.z, o); A.stations.push(s); return s; };
    A.local = (cid, list) => list.forEach(([sid, label, x, z, extra = {}]) => { const [gx, gz] = A.at(cid, x, z); A.add(sid, { label, x: gx, z: gz, chunk: cid, ...extra }); });
    A.portal = (x, z, r, to, label, tx, tz) => A.portals.push({ x, z, r, to, label, tx, tz });
    A.chunkAt = (x, z) => A.chunks.find(c => x >= c.frame[0] && x < c.frame[0] + c.frame[2] && z >= c.frame[1] && z < c.frame[1] + c.frame[3]);
    A.finish = () => {
      const pad = 12, cx0 = Math.min(...A.chunks.map(c => c.frame[0])) - pad, cz0 = Math.min(...A.chunks.map(c => c.frame[1])) - pad, cx1 = Math.max(...A.chunks.map(c => c.frame[0] + c.frame[2])) + pad, cz1 = Math.max(...A.chunks.map(c => c.frame[1] + c.frame[3])) + pad;
      const x0 = Math.floor(cx0), z0 = Math.floor(cz0), gw = Math.ceil((cx1 - x0) / CELL), gh = Math.ceil((cz1 - z0) / CELL), grid = new Uint8Array(gw * gh).fill(1);
      const ci = x => Math.floor((x - x0) / CELL), cj = z => Math.floor((z - z0) / CELL);
      A.chunks.forEach(c => { const m = M[c.id], g = decode(m), bx = ci(c.frame[0]), bz = cj(c.frame[1]); for (let j = 0; j < m.gh; j++) for (let i = 0; i < m.gw; i++) { const X = bx + i, Z = bz + j; if (X >= 0 && Z >= 0 && X < gw && Z < gh) grid[Z * gw + X] = g[j * m.gw + i]; } });
      const carveRect = (x, z, w, h) => { for (let j = cj(z); j <= cj(z + h); j++) for (let i = ci(x); i <= ci(x + w); i++) if (i >= 0 && j >= 0 && i < gw && j < gh) grid[j * gw + i] = 0; };
      A.roads.forEach(r => carveRect(r.x, r.z, r.w, r.h));
      const carve = (x, z, r) => { const c = Math.ceil(r / CELL); for (let j = cj(z) - c; j <= cj(z) + c; j++) for (let i = ci(x) - c; i <= ci(x) + c; i++) if (i >= 0 && j >= 0 && i < gw && j < gh && Math.hypot((i - ci(x)) * CELL, (j - cj(z)) * CELL) <= r) grid[j * gw + i] = 0; };
      A.stations.forEach(s => carve(s.x, s.z, 1.3)); A.portals.forEach(p => { carve(p.x, p.z, p.r + .6); });
      carve(A.spawn[0], A.spawn[1], 3); (A.arrivals || []).forEach(a => carve(a[0], a[1], 2.5));
      const idx = (x, z) => cj(z) * gw + ci(x), N = gw * gh;
      const flood = () => { const seen = new Uint8Array(N), q = [idx(...A.spawn)]; seen[q[0]] = 1; while (q.length) { const c = q.pop(), i = c % gw, j = (c - i) / gw; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = i + a, y = j + b; if (x < 0 || y < 0 || x >= gw || y >= gh) continue; const n = y * gw + x; if (!seen[n] && !grid[n]) { seen[n] = 1; q.push(n); } } } return seen; };
      let seen = flood();
      [...A.stations, ...A.portals, ...(A.arrivals || []).map(a => ({ x: a[0], z: a[1], label: 'arrival' }))].forEach(t => {
        const start = idx(t.x, t.z); if (seen[start]) return;
        const prev = new Int32Array(N).fill(-1); prev[start] = start; const q = [start]; let hit = -1;
        for (let h = 0; h < q.length && hit < 0; h++) { const c = q[h], i = c % gw, j = (c - i) / gw; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = i + a, y = j + b; if (x < 0 || y < 0 || x >= gw || y >= gh) continue; const n = y * gw + x; if (prev[n] < 0) { prev[n] = c; if (seen[n]) { hit = n; break; } q.push(n); } } }
        if (hit < 0) { A.unreachable.push(t.label); return; }
        for (let c = hit; c !== start; c = prev[c]) grid[c] = 0;
        seen = flood();
      });
      Object.assign(A, { frame: [x0, z0, gw * CELL, gh * CELL], gw, gh, grid });
      return A;
    };
    return A;
  }
  const STATIONS = { epk: null };
  const EPK = { ravecharles: [page('RAVE CHARLES EPK', 'epk/ravecharles/index.html'), page('His world (3D)', 'ravecharles.html')], shmorez: [page('SHMOREZ EPK', 'epk/shmorez/index.html'), page('His world (3D)', 'shmorez.html')], sofaboi: [page('SOFA KING SAD BOI EPK', 'epk/sofaboi/index.html'), page('His world (3D)', 'sofaboi.html')], driftwave: [page('DRIFTWAVE EPK', 'epk/driftwave/index.html'), L('Bandcamp', 'https://driftwavestatic.bandcamp.com'), page('His world (3D)', 'driftwave.html')], tanky: [page('TANKY JOHNSON EPK', 'epk/tanky/index.html'), page('His world (3D)', 'tanky.html')], studio: [page('12MATT3R EPK', 'epk/glitch/index.html'), page('The glitch room (3D)', 'studio.html'), L('12matt3r.univer.se', 'https://12matt3r.univer.se/')] };
  const TEXT = { ravecharles: 'The masked headliner, down in the mosh pit with the crowd instead of above it. Glowing LED visor, nearly 400 shows across America, 2014–2020.', shmorez: 'A toasted marshmallow man squishing to the bass. Cozy-surreal campground, giant bonfire, s’mores land.', sofaboi: 'Hood up, slumped on a beat-up couch under his own little rain cloud. Dubstep and weird bass.', driftwave: 'A chrome vaporwave figure in shades, haloed by a retro striped sun. Slushwave, ambient, vaporwave.', tanky: 'The outlaw of the void: a cowboy in a brown hat, white tee and blue jeans. Outlaw country.', studio: 'A glitching, RGB-splitting figure driving every screen at the festival. Glitch art, code, the collective.' };
  const RECOLOR = (k) => ({ links: EPK[k], text: TEXT[k], role: 'artist' });


  /* ================= FESTIVAL (its own area) ================= */
  const fest = buildArea('festival', 'Festival grounds', [['festival', 0, 0]], [-18, 18]);
  fest.arrivals = [[16.2, -24.2], [17.6, -10]];
  (function (A) { const local = A.local, add = A.add, at = A.at;
  local('festival', [
    ['decks', 'The Decks', 0, -22, { links: [page('Take the decks (DJ rig)', 'dj.html')], text: 'Two decks, EQ, filters, crossfader, tempo, cue, sync and loops. Upload your own tracks and mix live on the original.' }],
    ['ravecharles', 'RAVE CHARLES', 0, -16, RECOLOR('ravecharles')], ['studio', '12MATT3R', 0, -6, RECOLOR('studio')], ['driftwave', 'DRIFTWAVE STATIC', 0, 3, RECOLOR('driftwave')],
    ['sofaboi', 'SOFA KING SAD BOI', -18, -8, RECOLOR('sofaboi')], ['tanky', 'TANKY JOHNSON', 11, 7, RECOLOR('tanky')], ['shmorez', 'SHMOREZ', 14, 17, RECOLOR('shmorez')],
    ['merch', 'The Merch Tent', -24.5, 4, { links: [page('Open the store', 'store.html'), L('doesntmatter.store (Shopify)', 'https://zr1a7y-8x.myshopify.com')], text: 'Tees, hoodies, shorts. Tap any piece on the store page for front and back, sizes and price.' }],
    ['kiosk', 'Tools kiosk', -24.5, -1, { links: [page('Open the Tools aisle', 'lab.html?folder=Tools')], text: 'A lab-market kiosk: effects apps, the synth and vapor studios, the flash portal and the LoRA packs.' }],
    ['lounge', 'The Lounge', -24.5, 11, { text: 'Beat-up couches and a very good view of the stage. Take a load off.' }],
    ['dealer', 'Props dealer', -13, -13, { text: '"Everything on this table fell off something bigger. No refunds."' }],
    ['vault', 'Backstage vault', -19.5, -22, {}], ['keycard', 'Hidden keycard', 22, 20, {}],
    ['porta', "Porta John's", 24, 10, { links: [page('Read the Codex (the encyclopedia)', 'codex.html')], text: 'A row of porta-potties, one glowing an unhealthy green. Step inside and boot the old screen to read the Codex.' }],
    ['lab', 'The Lab', 0, 22, { links: [page('Boot the whole Lab', 'lab.html')], text: 'The side stage: big screens over a deck loaded with the playable side of 12matt3r.' }],
    ['booth', 'Photo booth', -6, 21, {}], ['board', 'Message board', -14, 20, { links: [page('Every link, alias and social', 'links.html')] }], ['bench', 'Park bench', -10, 20, {}], ['vj', 'VJ board', 5, 18, {}],
    ['jukebox', 'Jukebox', -21, 16, { text: 'The festival playlist.' }],
  ]);

    A.portal(19.6, -24.2, 1.6, 'complex', 'Enter The Complex', 44, -24.2);
    A.portal(20.4, -10, 1.8, 'midway', 'Enter The Midway', 0, 16);
  })(fest);
  fest.finish();

  /* ================= THE MIDWAY (its own area) ================= */
  const midway = buildArea('midway', 'The Midway', [['arcade', 0, 0]], [0, 16]);
  midway.arrivals = [[0, 16]];
  (function (A) { const local = A.local;
  const CAB = [['cab-flash', 'FLASH GAMES', -10.5, -14.5, 'classic/flash-games/flash-games-portal/index.html'], ['cab-wake', 'WAKE UP', -3.5, -15, 'lab.html?folder=Wake%20Up%20Series'], ['cab-games', 'GAMES', 3.5, -15, 'lab.html?folder=Games'], ['cab-stories', 'STORIES & EXPERIENCES', 10.5, -14.5, 'lab.html?folder=Stories%20%26%20Experiences'], ['dodge', 'DODGE HELL', -15, -5, null], ['cab-minecraft', 'MINECRAFT', -15, 3, 'games/minecraft/index.html'], ['cab-mini', 'MINI GAMES', 15, -5, 'games/browsergames/hub.html'], ['cab-knock', 'KNOCK KNOCK · GROOVEBOX', 15, 3, 'games/knock-knock/index.html'], ['cab-flashstorage', 'FLASHSTORAGE ARCHIVE', -15, 11, 'games/flashstorage-archive/index.html'], ['cab-w93', 'WINDOWS93', 15, 11, 'windows93/127.0.0.1_8081/dl/index.html'], ['cab-w97', 'WINDOWS 97 ULTIMATE', 15, -13, 'games/windows97/index.html']];
  local('arcade', CAB.map(([id, label, x, z, p]) => [id, label + ' cabinet', x, z + (z < 0 ? 2.4 : -2.4), p ? { links: [page('Play ' + label, p)], text: 'An arcade cabinet in the Midway.' } : { text: 'Dodge everything for as long as you can.' }]));

    A.portal(0, 19.2, 2.2, 'festival', 'Back to the festival', 17.6, -10);
  })(midway);
  midway.finish();

  /* ================= THE COMPLEX (the only area with the room loop) ================= */
  const roomLayout = (() => {
    const p = [['complex', 68, -60]], rows = []; let x = 44, z = 14, rowH = 0; const LIMIT = 374, GAP = 14;
    const ids = [...shelfOrder].sort((a, b) => M[b].frame[3] - M[a].frame[3]); let row = { z, items: [] };
    ids.forEach(id => { const f = M[id].frame; if (x + f[2] > LIMIT && row.items.length) { z += rowH + GAP; x = 44; rowH = 0; rows.push(row); row = { z, items: [] }; } p.push([id, x - f[0], z - f[1]]); row.items.push({ id, x, z, w: f[2], h: f[3] }); x += f[2] + GAP; rowH = Math.max(rowH, f[3]); });
    rows.push(row); return { p, rows };
  })();
  const complex = buildArea('complex', 'The Complex', roomLayout.p, [44, -24.2]);
  complex.rows = roomLayout.rows;
  complex.arrivals = [[44, -24.2]];
  (function (A) { const local = A.local, add = A.add, at = A.at, rows = A.rows;
    const cxs = at('complex', 0, 40);
    A.poly([[37.5, -24.2], [cxs[0], -24.2], [cxs[0], cxs[1] + 3]]);            // entrance road -> Complex street
    const rightX = Math.max(...rows.map(r => Math.max(...r.items.map(i => i.x + i.w)))) + 8;
    A.vRoad(36, -24.2, rows[0].z - 6);
    rows.forEach((r, ri) => {
      const az = r.z - 6; A.hRoad(36, rightX, az);
      if (ri < rows.length - 1) A.vRoad(36, az, rows[ri + 1].z - 6);
      r.items.forEach(i => A.vRoad(i.x + i.w / 2, az, i.z + 6));
    });
    A.vRoad(rightX, rows[0].z - 6, rows[rows.length - 1].z - 6);                 // closes the loop on the east side
    doorXs.forEach(x => A.vRoad(at('complex', x, 0)[0], at('complex', 0, 50)[1], rows[0].z - 6));
  const HALL = [['tv', 'Dream OS · Theater', 'tv.html'], ['vj', 'VJ · Stage', 'vj.html'], ['greenroom', 'THE ROOMS ▸ (the big loop)', 'greenroom.html'], ['museum', 'The Gallery', 'museum.html'], ['arcade', 'Arcade + Karaoke', 'arcade.html'], ['gamecity', 'The Block', 'gamecity.html'], ['opencity', 'Open City (driving sim)', 'games/open-city/index.html'], ['horror', 'Bridge Horror House', 'games/horror-house/index.html'], ['links', 'Links · all projects', 'links.html'], ['builder', 'Room Builder', 'builder.html']];
  local('complex', [
    ...HALL.map(([k, label, p], i) => ['cx-' + k, label, doorXs[i], 50.9, { links: [page('Open: ' + label, p)], text: 'A door on the entrance wall. On this map the road below leads out to the rooms.' }]),
    ['orb', 'The heart', 0, 4, { text: 'A levitating orb, the heart of the hub. Behind it is a hidden door.' }],
    ['cx-glitch', 'Glitch chamber', -23, 0, { links: [page('Open the glitch room', 'studio.html')] }], ['cx-horrorcore', 'Horrorcore chamber', -23, -14, { links: [page('Open horrorcore', 'horrorcore.html')] }],
    ['cx-abstract', 'Abstract chamber', 23, -9, { links: [page('Open abstract', 'abstract.html')] }], ['cx-arcade', 'Arcade chamber', 23, -1, { links: [page('Open the arcade', 'arcade.html')] }],
    ['cx-theater', 'Festival · Theater chamber', 23, -17, { text: 'A velvet arch, amber spotlights, a stage and a big screen. Nothing is playing right now.' }],
    ['cx-hidden', 'The Hidden Room door', 0, -22.6, { links: [page('Open the hidden room', 'hidden.html')] }],
    ['cx-rooftop', 'The Rooms (far end)', 29, 40, { links: [page('Open the rooftop', 'rooftop.html')] }], ['cx-greenroom', 'THE ROOMS ▸', -29, 40, { links: [page('Start the room loop', 'greenroom.html')] }],
  ]);
  // The Block: the physical games live here (positions are relative to its aisle spawn at 16,20)
  local('gamecity', [['hoops', 'Basketball hoop', 2, 16], ['gallery', 'Shooting gallery', 30, 16], ['dunk', 'Dunk tank', 16, 8], ['paw', "The Monkey's Paw", 0, 26], ['block-page', 'THE BLOCK', 16, 20, { links: [page('Open The Block (3D original)', 'gamecity.html')], text: 'Street games and the racetrack.' }]]);
  const artistItems = { ravecharles: [['person', 'Rave Charles figure', 0, -8], ['epk', 'Stage screen — EPK', 0, -25.4], ['structure', 'LED-visor mask monument', -18, 0], ['landmark', 'Tour road', 18, -6]], sofaboi: [['epk', 'Sofa throne + EPK TV', 0, -18], ['structure', 'Bass pit — sub stack', 13, -7], ['structure', 'Bass pit — sub stack ', 23, 7]], driftwave: [['person', 'DriftWave figure', 0, 1], ['epk', 'Temple monolith — EPK', 0, -8], ['structure', 'Lo-fi nook', -20, 2], ['structure', 'DreamOS workstation', -14, 7], ['structure', 'Deadnet portal', 21, 11], ['game', 'Parkour spiral', 16, -6]], glitch: [['structure', 'Stacked-CRT monument', 0, 0], ['epk', 'Big CRT — EPK (web-OS)', 0, 4.4], ['person', '12matt3r figure', 9, 8], ['structure', 'Workstation', 14, 4], ['landmark', 'Exit portal', -16, 4]], tanky: [['person', 'Tanky Johnson figure', 12, 8], ['structure', 'Saloon', 0, -20], ['epk', 'Jukebox — EPK', 4.5, -13.8]], shmorez: [['person', 'Shmorez figure', 4, 2], ['epk', 'Visuals screen — EPK', 0, -20], ['structure', 'Giant s’more', -18, -13]] };
  const ART = { ravecharles: 'ravecharles', sofaboi: 'sofaboi', driftwave: 'driftwave', glitch: 'studio', tanky: 'tanky', shmorez: 'shmorez' };
  Object.entries(artistItems).forEach(([cid, items]) => items.forEach(([kind, label, x, z]) => { const [gx, gz] = at(cid, x, z); add(cid + ':' + label, { label, x: gx, z: gz, chunk: cid, kind, links: (kind === 'epk' || kind === 'person') ? EPK[ART[cid]] : undefined, text: kind === 'epk' ? 'The press-kit screen. Open the real EPK.' : kind === 'person' ? TEXT[ART[cid]] : 'A set piece in this world.' }); }));

    rows.forEach(r => r.items.forEach(i => add('sign:' + i.id, { label: NAMES[i.id], x: i.x + i.w / 2, z: i.z + 4, kind: 'sign', text: NAMES[i.id] + '.' })));
    A.portal(37.5, -24.2, 1.6, 'festival', 'Back to the festival', 16.2, -24.2);
  })(complex);
  complex.finish();

  return { areas: { festival: fest, midway, complex }, NAMES, BASE, MEDIA };
})();
