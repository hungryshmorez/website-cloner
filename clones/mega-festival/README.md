# 12 Mega Festival (city)

A walkable top-down version of the 12matt3r festival and everything inside it. Every map is an overhead render of the festival repo's own 3D scenes, so the layouts are the real ones, not redraws.

**How the maps were made:** `Site/scripts/overhead-shots.mjs` already renders a world from above. The same approach was run on 21 worlds with roofs and ceilings hidden (the circus tent roof, hub ceilings, room canopies), and each render also records the wall and prop footprints (used for collision) and the doors (`window.__doors`). Renders are 20 px per map unit, matching the game. Output lives in `maps/` (images) and `maps.js` (frames, collision grids, doors).

**Worlds (21):** festival grounds; The Midway (arcade tent); The Complex hub with its street, room-door wall and chambers; the six artist worlds (Rave Charles, Sofa King Sad Boi, DriftWave Static, 12matt3r glitch room, Tanky Johnson, Shmorez); and the rooms off the hub (horrorcore, abstract, hidden room, rooftop, lo-fi, VJ stage, room builder, gallery, Dream OS theater, merch boutique, The Block, vapor rooms).

**Getting around:** walk into a glowing door ring, or press E at an artist / chamber and choose "Step inside". Every world has an exit ring at its entrance, and you always return to where you came from. Doors are checked automatically: all 29 walk-in doors transition correctly and every station in every world is reachable.

**Playable:** Midway basketball, shooting gallery, dunk tank, DODGE HELL, Monkey's Paw. **Not built into this map** (separate pages or games in the original): The Rooms loop (greenroom), Open City, Bridge Horror House, Links, the Lab launcher, bullet-hell arena, race track. The four other Midway cabinets are marked out of order.

Run it: open `index.html`, or `python3 -m http.server` here. Controls: WASD/arrows or click to move, E to interact, Enter to chat.
