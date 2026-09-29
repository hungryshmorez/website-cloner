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

  /* ---------- layout ---------- */
  const fixed = { festival: [0, 0], complex: [68, -60], arcade: [0, 62] };
  const shelfOrder = ['gamecity', 'store', 'tanky', 'ravecharles', 'shmorez', 'driftwave', 'sofaboi', 'hidden', 'abstract', 'rooftop', 'vaporrooms', 'lofi', 'glitch', 'vj', 'museum', 'horrorcore', 'tv', 'builder'];
  const NAMES = { festival: 'Festival grounds', complex: 'The Complex', arcade: 'The Midway', gamecity: 'The Block', store: 'The Merch Boutique', tanky: 'Tanky Johnson — cosmic western', ravecharles: 'Rave Charles — neon mosh pit', shmorez: 'Shmorez — s’mores campground', driftwave: 'DriftWave Static — vaporwave dreamscape', sofaboi: 'Sofa King Sad Boi — couch kingdom', hidden: 'The Hidden Room', abstract: 'Abstract chamber', rooftop: 'The Rooftop', vaporrooms: 'Vapor rooms', lofi: 'Lo-fi room', glitch: '12matt3r — glitch CRT room', vj: 'VJ · Stage', museum: 'The Gallery', horrorcore: 'Horrorcore chamber', tv: 'Dream OS · Theater', builder: 'Room Builder' };
  const chunks = [], off = {};
  const put = (id, ox, oz) => { const f = M[id].frame; off[id] = [ox, oz]; chunks.push({ id, name: NAMES[id], ox, oz, frame: [f[0] + ox, f[1] + oz, f[2], f[3]], img: null }); };
  Object.entries(fixed).forEach(([id, o]) => put(id, o[0], o[1]));
  const rows = []; { let x = 44, z = 14, rowH = 0; const LIMIT = 330, GAP = 14;
    const ids = [...shelfOrder].sort((a, b) => M[b].frame[3] - M[a].frame[3]);
    let row = { z, items: [] };
    ids.forEach(id => { const f = M[id].frame; if (x + f[2] > LIMIT + 44 && row.items.length) { z += rowH + GAP; x = 44; rowH = 0; rows.push(row); row = { z, items: [] }; } put(id, x - f[0], z - f[1]); row.items.push({ id, x, z, w: f[2], h: f[3] }); x += f[2] + GAP; rowH = Math.max(rowH, f[3]); });
    rows.push(row); }
  const G = id => chunks.find(c => c.id === id);
  const at = (id, x, z) => [x + off[id][0], z + off[id][1]];

  /* ---------- roads (walkable, drawn as asphalt) ---------- */
  const roads = [];
  const hRoad = (x1, x2, z) => roads.push({ x: Math.min(x1, x2), z: z - ROAD / 2, w: Math.abs(x2 - x1), h: ROAD });
  const vRoad = (x, z1, z2) => roads.push({ x: x - ROAD / 2, z: Math.min(z1, z2), w: ROAD, h: Math.abs(z2 - z1) });
  const poly = pts => { for (let i = 1; i < pts.length; i++) { const [a, b] = [pts[i - 1], pts[i]]; if (a[1] === b[1]) hRoad(a[0], b[0], a[1]); else vRoad(a[0], a[1], b[1]); } roads.push({ x: pts[pts.length - 1][0] - ROAD / 2, z: pts[pts.length - 1][1] - ROAD / 2, w: ROAD, h: ROAD }); };
  const cxs = at('complex', 0, 40);                                  // Complex street
  poly([[19.6, -24.2], [cxs[0], -24.2], [cxs[0], cxs[1] + 3]]);      // festival gate -> Complex street
  const lastZ = Math.max(...rows.map(r => r.z + Math.max(...r.items.map(i => i.h))));
  vRoad(36, -24.2, rows[0].z - 6);
  rows.forEach((r, ri) => {
    const az = r.z - 6, x2 = Math.max(...r.items.map(i => i.x + i.w / 2));
    hRoad(36, x2 + 2, az);
    if (ri < rows.length - 1) vRoad(36, az, rows[ri + 1].z - 6);
    r.items.forEach(i => vRoad(i.x + i.w / 2, az, i.z + 6));
  });
  const mid = at('arcade', 0, 0); poly([[20.4, -10], [29, -10], [29, 34], [0, 34], [0, 46]]);
  const doorXs = [-23, -17.9, -12.8, -7.7, -2.6, 2.6, 7.7, 12.8, 17.9, 23];
  doorXs.forEach(x => vRoad(at('complex', x, 0)[0], at('complex', 0, 50)[1], rows[0].z - 6));

  /* ---------- global grid ---------- */
  const x0 = -34, z0 = -100, x1 = Math.max(...chunks.map(c => c.frame[0] + c.frame[2])) + 10, z1 = Math.max(...chunks.map(c => c.frame[1] + c.frame[3])) + 10;
  const gw = Math.ceil((x1 - x0) / CELL), gh = Math.ceil((z1 - z0) / CELL), grid = new Uint8Array(gw * gh).fill(1);
  const ci = x => Math.floor((x - x0) / CELL), cj = z => Math.floor((z - z0) / CELL);
  chunks.forEach(c => { const m = M[c.id], g = decode(m), bx = ci(c.frame[0]), bz = cj(c.frame[1]); for (let j = 0; j < m.gh; j++) for (let i = 0; i < m.gw; i++) { const X = bx + i, Z = bz + j; if (X >= 0 && Z >= 0 && X < gw && Z < gh) grid[Z * gw + X] = g[j * m.gw + i]; } });
  const carveRect = (x, z, w, h) => { for (let j = cj(z); j <= cj(z + h); j++) for (let i = ci(x); i <= ci(x + w); i++) if (i >= 0 && j >= 0 && i < gw && j < gh) grid[j * gw + i] = 0; };
  roads.forEach(r => carveRect(r.x, r.z, r.w, r.h));
  const carve = (x, z, r) => { const c = Math.ceil(r / CELL); for (let j = cj(z) - c; j <= cj(z) + c; j++) for (let i = ci(x) - c; i <= ci(x) + c; i++) if (i >= 0 && j >= 0 && i < gw && j < gh && Math.hypot((i - ci(x)) * CELL, (j - cj(z)) * CELL) <= r) grid[j * gw + i] = 0; };

  /* ---------- stations ---------- */
  const stations = [], zones = [];
  const add = (id, o) => { const s = st(o.sid || id, o.label, o.x, o.z, o); stations.push(s); return s; };
  const local = (cid, list) => list.forEach(([sid, label, x, z, extra = {}]) => { const [gx, gz] = at(cid, x, z); add(sid, { label, x: gx, z: gz, chunk: cid, ...extra }); });
  const EPK = { ravecharles: [page('RAVE CHARLES EPK', 'epk/ravecharles/index.html'), page('His world (3D)', 'ravecharles.html')], shmorez: [page('SHMOREZ EPK', 'epk/shmorez/index.html'), page('His world (3D)', 'shmorez.html')], sofaboi: [page('SOFA KING SAD BOI EPK', 'epk/sofaboi/index.html'), page('His world (3D)', 'sofaboi.html')], driftwave: [page('DRIFTWAVE EPK', 'epk/driftwave/index.html'), L('Bandcamp', 'https://driftwavestatic.bandcamp.com'), page('His world (3D)', 'driftwave.html')], tanky: [page('TANKY JOHNSON EPK', 'epk/tanky/index.html'), page('His world (3D)', 'tanky.html')], studio: [page('12MATT3R EPK', 'epk/glitch/index.html'), page('The glitch room (3D)', 'studio.html'), L('12matt3r.univer.se', 'https://12matt3r.univer.se/')] };
  const TEXT = { ravecharles: 'The masked headliner, down in the mosh pit with the crowd instead of above it. Glowing LED visor, nearly 400 shows across America, 2014–2020.', shmorez: 'A toasted marshmallow man squishing to the bass. Cozy-surreal campground, giant bonfire, s’mores land.', sofaboi: 'Hood up, slumped on a beat-up couch under his own little rain cloud. Dubstep and weird bass.', driftwave: 'A chrome vaporwave figure in shades, haloed by a retro striped sun. Slushwave, ambient, vaporwave.', tanky: 'The outlaw of the void: a cowboy in a brown hat, white tee and blue jeans. Outlaw country.', studio: 'A glitching, RGB-splitting figure driving every screen at the festival. Glitch art, code, the collective.' };
  const RECOLOR = (k) => ({ links: EPK[k], text: TEXT[k], role: 'artist' });

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
    ['gate-complex', 'THE COMPLEX gate', 19.6, -22.6, { links: [page('Enter the complex (3D original)', 'warehouse.html')], text: 'The grand pavilion and the public face of the immersive complex. Follow the road east to walk into it.' }],
    ['gate-midway', 'THE MIDWAY (striped tent)', 20.4, -8.2, { links: [page('Step into the midway (3D original)', 'arcade.html')], text: 'A striped carnival tent built into the wall. Follow the road east: every game lives under one big top.' }],
  ]);
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
  const CAB = [['cab-flash', 'FLASH GAMES', -10.5, -14.5, 'classic/flash-games/flash-games-portal/index.html'], ['cab-wake', 'WAKE UP', -3.5, -15, 'lab.html?folder=Wake%20Up%20Series'], ['cab-games', 'GAMES', 3.5, -15, 'lab.html?folder=Games'], ['cab-stories', 'STORIES & EXPERIENCES', 10.5, -14.5, 'lab.html?folder=Stories%20%26%20Experiences'], ['dodge', 'DODGE HELL', -15, -5, null], ['cab-minecraft', 'MINECRAFT', -15, 3, 'games/minecraft/index.html'], ['cab-mini', 'MINI GAMES', 15, -5, 'games/browsergames/hub.html'], ['cab-knock', 'KNOCK KNOCK · GROOVEBOX', 15, 3, 'games/knock-knock/index.html'], ['cab-flashstorage', 'FLASHSTORAGE ARCHIVE', -15, 11, 'games/flashstorage-archive/index.html'], ['cab-w93', 'WINDOWS93', 15, 11, 'windows93/127.0.0.1_8081/dl/index.html'], ['cab-w97', 'WINDOWS 97 ULTIMATE', 15, -13, 'games/windows97/index.html']];
  local('arcade', CAB.map(([id, label, x, z, p]) => [id, label + ' cabinet', x, z + (z < 0 ? 2.4 : -2.4), p ? { links: [page('Play ' + label, p)], text: 'An arcade cabinet in the Midway.' } : { text: 'Dodge everything for as long as you can.' }]));
  // The Block: the physical games live here (positions are relative to its aisle spawn at 16,20)
  local('gamecity', [['hoops', 'Basketball hoop', 2, 16], ['gallery', 'Shooting gallery', 30, 16], ['dunk', 'Dunk tank', 16, 8], ['paw', "The Monkey's Paw", 0, 26], ['block-page', 'THE BLOCK', 16, 20, { links: [page('Open The Block (3D original)', 'gamecity.html')], text: 'Street games and the racetrack.' }]]);
  const artistItems = { ravecharles: [['person', 'Rave Charles figure', 0, -8], ['epk', 'Stage screen — EPK', 0, -25.4], ['structure', 'LED-visor mask monument', -18, 0], ['landmark', 'Tour road', 18, -6]], sofaboi: [['epk', 'Sofa throne + EPK TV', 0, -18], ['structure', 'Bass pit — sub stack', 13, -7], ['structure', 'Bass pit — sub stack ', 23, 7]], driftwave: [['person', 'DriftWave figure', 0, 1], ['epk', 'Temple monolith — EPK', 0, -8], ['structure', 'Lo-fi nook', -20, 2], ['structure', 'DreamOS workstation', -14, 7], ['structure', 'Deadnet portal', 21, 11], ['game', 'Parkour spiral', 16, -6]], glitch: [['structure', 'Stacked-CRT monument', 0, 0], ['epk', 'Big CRT — EPK (web-OS)', 0, 4.4], ['person', '12matt3r figure', 9, 8], ['structure', 'Workstation', 14, 4], ['landmark', 'Exit portal', -16, 4]], tanky: [['person', 'Tanky Johnson figure', 12, 8], ['structure', 'Saloon', 0, -20], ['epk', 'Jukebox — EPK', 4.5, -13.8]], shmorez: [['person', 'Shmorez figure', 4, 2], ['epk', 'Visuals screen — EPK', 0, -20], ['structure', 'Giant s’more', -18, -13]] };
  const ART = { ravecharles: 'ravecharles', sofaboi: 'sofaboi', driftwave: 'driftwave', glitch: 'studio', tanky: 'tanky', shmorez: 'shmorez' };
  Object.entries(artistItems).forEach(([cid, items]) => items.forEach(([kind, label, x, z]) => { const [gx, gz] = at(cid, x, z); add(cid + ':' + label, { label, x: gx, z: gz, chunk: cid, kind, links: (kind === 'epk' || kind === 'person') ? EPK[ART[cid]] : undefined, text: kind === 'epk' ? 'The press-kit screen. Open the real EPK.' : kind === 'person' ? TEXT[ART[cid]] : 'A set piece in this world.' }); }));
  // signposts at each room entrance
  rows.forEach(r => r.items.forEach(i => add('sign:' + i.id, { label: NAMES[i.id], x: i.x + i.w / 2, z: i.z + 4, kind: 'sign', text: NAMES[i.id] + '.', })));
  const chunkAt = (x, z) => chunks.find(c => x >= c.frame[0] && x < c.frame[0] + c.frame[2] && z >= c.frame[1] && z < c.frame[1] + c.frame[3]);

  /* ---------- carve + connect ---------- */
  stations.forEach(s => carve(s.x, s.z, 1.3));
  const spawn = [-18, 18]; carve(spawn[0], spawn[1], 3);
  const idx = (x, z) => cj(z) * gw + ci(x), N = gw * gh;
  const flood = () => { const seen = new Uint8Array(N), q = [idx(...spawn)]; seen[q[0]] = 1; while (q.length) { const c = q.pop(), i = c % gw, j = (c - i) / gw; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = i + a, y = j + b; if (x < 0 || y < 0 || x >= gw || y >= gh) continue; const n = y * gw + x; if (!seen[n] && !grid[n]) { seen[n] = 1; q.push(n); } } } return seen; };
  let seen = flood(); const unreachable = [];
  stations.forEach(t => {
    const start = idx(t.x, t.z); if (seen[start]) return;
    const prev = new Int32Array(N).fill(-1); prev[start] = start; const q = [start]; let hit = -1;
    for (let h = 0; h < q.length && hit < 0; h++) { const c = q[h], i = c % gw, j = (c - i) / gw; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = i + a, y = j + b; if (x < 0 || y < 0 || x >= gw || y >= gh) continue; const n = y * gw + x; if (prev[n] < 0) { prev[n] = c; if (seen[n]) { hit = n; break; } q.push(n); } } }
    if (hit < 0) { unreachable.push(t.label); return; }
    for (let c = hit; c !== start; c = prev[c]) grid[c] = 0;
    seen = flood();
  });

  return { frame: [x0, z0, gw * CELL, gh * CELL], cell: CELL, gw, gh, grid, chunks, roads, stations, spawn, rows, zones, chunkAt, unreachable, off, NAMES, BASE, MEDIA };
})();
