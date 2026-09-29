// Scenes in map units (x east, z south), matching the festival repo's own
// worldmaps.js. The festival and arcade backdrops are top-down renders of the
// real 3D scenes (see Site/scripts/overhead-shots.mjs); bounds below are the
// exact framing that script used, so image pixels line up with map units.
window.WORLD = (() => {
  const frame = ([a, b, c, d]) => { const m = 1.08, cx = (a + b) / 2, cz = (c + d) / 2, hw = (b - a) / 2 * m, hh = (d - c) / 2 * m; return [cx - hw, cz - hh, hw * 2, hh * 2]; };
  const st = (id, label, x, z) => ({ id, label, x, z });

  const festival = {
    id: 'festival', name: 'Festival grounds', img: 'festival', frame: frame([-30, 30, -28, 26]),
    walk: { minX: -28, maxX: 28, minZ: -27.5, maxZ: 26 },
    obstacles: [
      { r: [-15, -28, 30, 9] },          // main stage
      { r: [19, -6.6, 7.4, 8.8] },       // The Complex
      { c: [26.8, -10, 5.6] },           // striped tent (Midway)
      { c: [-18.1, 7, 3.6] },            // car
      { r: [-6.9, 19.5, 12.5, 5] },      // The Lab block
      { r: [15.5, 12, 5, 7.4] },         // camp room
      { r: [8.2, -9, 5.4, 5.9] },        // sofa stage
      { c: [16, 21, 2.2] }
    ],
    zones: [[-9, -21, 18, 13, 'THE PIT'], [-15, -28, 30, 9, 'MAIN STAGE'], [19, -7, 8, 9, 'THE COMPLEX'], [21, -16, 12, 12, 'THE MIDWAY']],
    stations: [
      st('decks', 'The Decks', 0, -22), st('ravecharles', 'RAVE CHARLES', 0, -16), st('studio', '12MATT3R', 0, -6), st('driftwave', 'DRIFTWAVE STATIC', 0, 3),
      st('sofaboi', 'SOFA KING SAD BOI', 11, -6), st('tanky', 'TANKY JOHNSON', 11, 7), st('shmorez', 'SHMOREZ', 14, 17),
      st('merch', 'The Merch Tent', -24.5, 4), st('kiosk', 'Tools kiosk', -24.5, -1), st('lounge', 'The Lounge', -24.5, 11), st('dealer', 'Props dealer', -13, -13),
      st('vault', 'Backstage vault', -15, -20), st('keycard', 'Hidden keycard', 22, 20), st('porta', "Porta John's", 24, 10), st('lab', 'The Lab', 0, 22),
      st('booth', 'Photo booth', -6, 21), st('board', 'Message board', -14, 20), st('bench', 'Park bench', -10, 20), st('vj', 'VJ board', 5, 18)
    ],
    doors: [
      { x: 18.4, z: -2.2, r: 1.8, to: 'complex', tx: 0, tz: 6, label: 'Enter The Complex' },
      { x: 20.4, z: -10, r: 1.8, to: 'midway', tx: 0, tz: 16, label: 'Enter The Midway' }
    ],
    people: { fixedNames: true }, spawn: [-18, 18]
  };

  const midway = {
    id: 'midway', name: 'The Midway', img: 'arcade', frame: frame([-22, 22, -22, 22]),
    walk: { circle: 20 },
    obstacles: [[-10, -6], [-6, -8], [6, -8], [10, -6], [0, -10]].map(([x, z]) => ({ c: [x, z, 1.7] })).concat([{ c: [0, -6, 1.3] }, { c: [-9, 4, 1.6] }, { c: [9, 4, 1.6] }, { c: [0, 6, 1.6] }]),
    zones: [],
    stations: [
      st('cab-flash', 'Flash portal cabinet', -10, -4.2), st('cab-wake', 'Wake Up cabinet', -6, -6.2), st('cab-games', 'Games cabinet', 6, -6.2), st('cab-stories', 'Stories cabinet', 10, -4.2),
      st('dodge', 'DODGE HELL cabinet', 0, -8.2), st('paw', "The Monkey's Paw", 0, -4.3), st('hoops', 'Basketball hoop', -9, 5.8), st('gallery', 'Shooting gallery', 9, 5.8), st('dunk', 'Dunk tank', 0, 7.8)
    ],
    doors: [{ x: 0, z: 19.3, r: 2.2, to: 'festival', tx: 17.8, tz: -10, label: 'Back to the festival' }],
    spawn: [0, 16]
  };

  const complex = {
    id: 'complex', name: 'The Complex', frame: [-15, -11, 30, 22], bg: 'complex',
    walk: { minX: -14, maxX: 14, minZ: -10, maxZ: 10 },
    obstacles: [{ c: [0, -1, 2] }],
    zones: [],
    stations: [
      st('orb', 'The heart', 0, 1.8), st('welcome', 'Welcome wall', 0, 6),
      st('f-ravecharles', 'Frame: RAVE CHARLES', -9, -8.6), st('f-shmorez', 'Frame: SHMOREZ', -4.5, -8.6), st('f-driftwave', 'Frame: DRIFTWAVE STATIC', 0, -8.6), st('f-tanky', 'Frame: TANKY JOHNSON', 4.5, -8.6), st('f-sofaboi', 'Frame: SOFA KING SAD BOI', 9, -8.6)
    ],
    doors: [
      { x: 0, z: 9.6, r: 2, to: 'festival', tx: 16, tz: -2.2, label: 'Back to the festival' },
      { x: 13.6, z: 0, r: 1.8, to: 'theater', tx: -9, tz: 4, label: 'Immersive Theater' }
    ],
    spawn: [0, 6]
  };

  const theater = {
    id: 'theater', name: 'Immersive Theater', frame: [-13, -9, 26, 18], bg: 'theater',
    walk: { minX: -12, maxX: 12, minZ: -8, maxZ: 8 },
    obstacles: [{ r: [-8, -8, 16, 3] }], zones: [],
    stations: [st('screen', 'The screen', 0, -4.2)],
    doors: [{ x: -11.6, z: 4, r: 1.6, to: 'complex', tx: 11.2, tz: 0, label: 'Back to The Complex' }],
    spawn: [-9, 4]
  };

  return { festival, midway, complex, theater };
})();
