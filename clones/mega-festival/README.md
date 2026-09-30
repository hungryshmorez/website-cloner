# 12 Mega Festival

Three separate areas, each a walkable top-down map built from overhead renders of the festival repo's own 3D scenes (roofs and ceilings hidden). Collision comes from each scene's wall and prop footprints.

- **Festival grounds** stands on its own. Walk into the dashed ring at the northeast Complex pavilion, or at the striped tent, to enter those areas.
- **The Midway** is its own area: the arcade cabinets, each linking to the real game.
- **The Complex** is its own area and the only one with the room loop. The Complex hub sits at the top; roads run from its entrance street down a west trunk road and along four avenues that end in an east road, so the network is a closed loop. All 18 other rooms hang off it (The Block with its trailer park, the merch boutique, the six artist worlds, the gallery, theater, VJ stage, rooftop, hidden room, and more). Cut any one road and every room is still reachable.

**Objects were moved, not duplicated:** in a scratch copy of the Site repo the Complex, Sofa King's lounge and the Backstage Vault were repositioned in the scene data and the festival re-rendered.

**Real links:** gold rings open your live pages on `hungryshmorez.github.io/Site/` plus Bandcamp and the Shopify store. The Jukebox lists the playlist from the Media site.

**Controls:** WASD / arrows / click to walk, Shift to run, E or click a gold ring, M for the area map, Enter to chat.

Run it: open `index.html`, or `python3 -m http.server` here. In a viewer that blocks cross-site audio, the jukebox links open the tracks instead of playing in place.
