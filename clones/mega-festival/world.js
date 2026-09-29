// World definition: scenes, props, stations and doors.
// Festival coordinates come from the festival map (units, x east / z south);
// tp() converts them to tiles.
window.WORLD = (() => {
  const U = 1.5; // tiles per map unit
  const tp = (x, z) => [Math.round((x + 30) * U), Math.round((z + 28) * U)];
  const NIGHT = { a: '#00F3FF', b: '#FF0055', c: '#39FF14', d: '#b967ff', e: '#ff6b35', f: '#e6c04a' };

  // tile ids: 0 turf, 1 path, 2 wall, 3 floor, 4 pit lights, 5 stage, 8 door, 9 tree, 10 checker, 11 carpet, 12 seat floor
  function scene(id, name, w, h, fill, indoor) {
    return { id, name, w, h, indoor, tiles: Array.from({ length: h }, () => Array(w).fill(fill)), block: Array.from({ length: h }, () => Array(w).fill(false)), props: [], stations: [], doors: [], npcs: [], zones: [], spawn: [2, 2] };
  }
  const rect = (s, x, y, w, h, t) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (s.tiles[j]?.[i] !== undefined) s.tiles[j][i] = t; };
  const solid = (s, x, y, w, h) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (s.block[j]?.[i] !== undefined) s.block[j][i] = true; };
  const prop = (s, type, x, y, w, h, o = {}) => { s.props.push({ type, x, y, w, h, ...o }); if (o.solid !== false) solid(s, x, y, w, h); };
  const walls = (s) => { for (let i = 0; i < s.w; i++) { s.tiles[0][i] = 2; s.tiles[s.h - 1][i] = 2; } for (let j = 0; j < s.h; j++) { s.tiles[j][0] = 2; s.tiles[j][s.w - 1] = 2; } };
  const station = (s, x, y, label, id, extra = {}) => s.stations.push({ x, y, label, id, ...extra });
  const door = (s, x, y, w, h, to, tx, ty, label) => { rect(s, x, y, w, h, 8); for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) s.block[j][i] = false; s.doors.push({ x, y, w, h, to, tx, ty, label }); };

  /* ================= FESTIVAL GROUNDS ================= */
  const F = scene('festival', 'Festival grounds', 90, 81, 0, false);
  walls(F);
  const [sx, sz] = tp(-13, -28);
  rect(F, sx, 1, 39, 10, 5);                        // stage (north wall)
  rect(F, tp(-9, -21)[0], tp(0, -21)[1], 27, 14, 4); // mosh pit lights
  rect(F, tp(-2, 0)[0], tp(0, -21)[1] + 14, 6, 60, 1); // centre path south
  rect(F, tp(-28, 18)[0], tp(0, 18)[1], 57, 3, 1);    // southern promenade
  rect(F, tp(-28, 0)[0], tp(0, 5)[1], 40, 3, 1);      // mid promenade
  // trees along the outer edge
  for (let i = 3; i < F.w - 3; i += 5) { F.tiles[F.h - 3][i] = 9; F.block[F.h - 3][i] = true; }
  prop(F, 'led', sx + 4, 1, 30, 6, { solid: false, label: 'MAIN STAGE' });
  const [dx, dz] = tp(0, -24);
  prop(F, 'decks', dx - 3, dz, 6, 2, { solid: true });
  station(F, dx, dz + 3, 'The Decks: change the beat', 'decks');
  F.zones.push([sx, 1, 39, 10, 'MAIN STAGE'], [tp(-9, 0)[0], tp(0, -21)[1], 27, 14, 'THE PIT']);

  const at = (x, z) => tp(x, z);
  // artists
  const art = (id, name, x, z, style, accent) => { const [tx, ty] = at(x, z); F.npcs.push({ id, name, tx, ty, style, accent, fixed: true }); station(F, tx, ty + 2, name, id); };
  art('ravecharles', 'RAVE CHARLES', 0, -16, 'raver', NIGHT.b);
  art('sofaboi', 'SOFA KING SAD BOI', 11, -6, 'hooded', '#6a6cff');
  art('studio', '12MATT3R', 0, -6, 'glitch', NIGHT.a);
  art('driftwave', 'DRIFTWAVE STATIC', 0, 3, 'vapor', NIGHT.d);
  art('tanky', 'TANKY JOHNSON', 11, 7, 'cowboy', NIGHT.f);
  art('shmorez', 'SHMOREZ', 14, 17, 'marshmallow', NIGHT.e);
  // set dressing
  let [x, y] = at(11, -6); prop(F, 'couch', x - 4, y + 2, 5, 2, { color: '#4a4a86' });
  [x, y] = at(0, 3); prop(F, 'sun', x - 3, y - 8, 6, 5, { solid: false });
  [x, y] = at(12, 16); prop(F, 'fire', x - 1, y - 1, 2, 2, {});
  [x, y] = at(19, 15); prop(F, 'truck', x, y, 7, 3, {});
  // merch tent, lab kiosk, lounge
  [x, y] = at(-25, 4); prop(F, 'tent', x, y, 8, 5, { color: NIGHT.c }); station(F, x + 4, y + 6, 'Merch Tent', 'merch');
  [x, y] = at(-25, -1); prop(F, 'tent', x, y, 6, 4, { color: NIGHT.a }); station(F, x + 3, y + 5, 'Tools kiosk', 'kiosk');
  [x, y] = at(-25, 11); prop(F, 'couch', x, y, 5, 2, { color: '#7a3f5a' }); station(F, x + 2, y + 3, 'The Lounge', 'lounge');
  [x, y] = at(-13, -13); prop(F, 'stall', x, y, 5, 3, { color: NIGHT.e }); station(F, x + 2, y + 4, 'Props dealer', 'dealer');
  // vault + keycard
  [x, y] = at(-15, -20); prop(F, 'vault', x, y, 4, 3, {}); station(F, x + 2, y + 4, 'Backstage vault', 'vault');
  [x, y] = at(22, 20); station(F, x, y, 'Hidden keycard', 'keycard');
  // porta johns, photo booth, message board, bench, VJ board, the lab
  [x, y] = at(24, 10); prop(F, 'porta', x, y, 6, 3, {}); station(F, x + 3, y + 4, "Porta John's", 'porta');
  [x, y] = at(-6, 21); prop(F, 'booth', x, y, 3, 3, {}); station(F, x + 1, y + 4, 'Photo booth', 'booth');
  [x, y] = at(-14, 20); prop(F, 'board', x, y, 5, 3, {}); station(F, x + 2, y + 4, 'Message board', 'board');
  [x, y] = at(-10, 20); prop(F, 'bench', x, y, 3, 1, { solid: false }); station(F, x + 1, y + 2, 'Park bench', 'bench');
  [x, y] = at(5, 18); prop(F, 'vj', x, y, 3, 2, {}); station(F, x + 1, y + 3, 'VJ board', 'vj');
  [x, y] = at(0, 22); prop(F, 'tent', x - 3, y - 2, 6, 3, { color: '#ffd24a' }); station(F, x, y + 2, 'The Lab', 'lab');
  // THE COMPLEX (east)
  const [cx, cy] = at(24, -2);
  rect(F, cx, cy, 14, 9, 2); solid(F, cx, cy, 14, 9);
  prop(F, 'warehouse', cx, cy, 14, 9, { solid: false });
  door(F, cx + 6, cy + 8, 2, 1, 'complex', 20, 26, 'The Complex');
  F.zones.push([cx, cy, 14, 10, 'THE COMPLEX'], [0, 0, 90, 81, 'Festival grounds']);
  F.spawn = at(-18, 18); F.spawn = [F.spawn[0], F.spawn[1]];

  /* ================= THE COMPLEX ================= */
  const C = scene('complex', 'The Complex', 40, 30, 3, true);
  walls(C);
  rect(C, 6, 4, 28, 18, 10);                // checkerboard hub
  prop(C, 'orb', 18, 11, 4, 4, {});
  station(C, 20, 16, 'The heart', 'orb');
  rect(C, 17, 22, 6, 7, 11);                // entrance hall carpet
  door(C, 19, 29, 2, 1, 'festival', cx + 6, cy + 10, 'Back to the festival');
  door(C, 0, 12, 1, 4, 'midway', 30, 20, 'THE MIDWAY');
  door(C, 39, 12, 1, 4, 'theater', 2, 8, 'Immersive Theater');
  prop(C, 'sign', 2, 12, 3, 2, { solid: false, text: 'MIDWAY' });
  prop(C, 'sign', 35, 12, 3, 2, { solid: false, text: 'THEATER' });
  station(C, 20, 26, 'Welcome wall', 'welcome');
  C.spawn = [20, 27];

  /* ================= THE MIDWAY (arcade tent) ================= */
  const M = scene('midway', 'The Midway', 32, 26, 11, true);
  walls(M);
  const cab = (x, y, color, id, label) => { prop(M, 'cabinet', x, y, 3, 3, { color }); station(M, x + 1, y + 4, label, id); };
  cab(3, 3, '#ff6b35', 'cab-flash', 'Flash portal cabinet');
  cab(8, 2, '#39ff14', 'cab-wake', 'Wake Up cabinet');
  cab(20, 2, '#b967ff', 'cab-games', 'Games cabinet');
  cab(25, 3, '#e6c04a', 'cab-stories', 'Stories cabinet');
  cab(14, 2, '#ff0055', 'dodge', 'DODGE HELL cabinet');
  prop(M, 'paw', 15, 8, 2, 2, {}); station(M, 16, 11, "The Monkey's Paw", 'paw');
  prop(M, 'hoop', 3, 11, 3, 4, {}); station(M, 5, 16, 'Basketball hoop', 'hoops');
  prop(M, 'gallery', 26, 11, 4, 4, {}); station(M, 25, 16, 'Shooting gallery', 'gallery');
  prop(M, 'tank', 14, 16, 4, 4, {}); station(M, 16, 21, 'Dunk tank', 'dunk');
  door(M, 15, 25, 2, 1, 'complex', 2, 14, 'Back to The Complex');
  M.spawn = [16, 23];

  /* ================= IMMERSIVE THEATER ================= */
  const Th = scene('theater', 'Immersive Theater', 26, 18, 12, true);
  walls(Th);
  prop(Th, 'screen', 5, 1, 16, 5, { solid: false });
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) prop(Th, 'seat', 5 + c * 5, 8 + r * 2, 3, 1, { solid: false });
  station(Th, 13, 7, 'The screen', 'screen');
  door(Th, 0, 7, 1, 3, 'complex', 37, 14, 'Back to The Complex');
  Th.spawn = [2, 8];

  return { F, C, M, Th, scenes: { festival: F, complex: C, midway: M, theater: Th }, NIGHT };
})();
