# 12 Mega Festival (city)

A walkable top-down version of the 12matt3r festival. The map is the festival's own scene, not a redraw: `festival.jpg` and `arcade.jpg` are overhead renders made by `Site/scripts/overhead-shots.mjs` (orthographic camera, same framing the script uses), so image pixels line up with the map units in `Site/src/data/worldmaps.js`.

- **Festival grounds:** the real layout. Artists, vendors, the decks, the pit, the photo booth, message board, a hidden keycard and the locked backstage vault sit at their map coordinates. Collision shapes (stage, Complex, striped tent, car, Lab, camp room) were read off the render.
- **The Midway (striped tent):** uses the arcade world's own overhead render. Basketball, shooting gallery, dunk tank and DODGE HELL are playable; the Monkey's Paw grants wishes. The four other cabinets are marked out of order.
- **The Complex (white building):** the interior is built here: a checkerboard hub with a heart orb, artist frames, and a door to the Immersive Theater.

Re-render the maps with `node scripts/overhead-shots.mjs festival arcade` in the Site repo.

Run it: open `index.html`, or `python3 -m http.server` here. Controls: WASD/arrows or click to move, E to interact, Enter to chat.
