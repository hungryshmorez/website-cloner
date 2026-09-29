# 12 Mega Festival (one continuous campus)

A walkable top-down version of the 12matt3r festival and everything inside it. There is no room switching: the festival, The Complex, The Midway and 18 more rooms are laid out on one map and joined by roads. Walk from the festival gate east into the Complex street, along the trunk road and avenues, and down a spur into any room.

**The maps are the real scenes.** Each chunk is an overhead render of the festival repo's own 3D scene, made with the repo's `scripts/overhead-shots.mjs` approach (roofs and ceilings hidden). Collision comes from the scene's wall and prop footprints. Renders are 20 px per map unit. `maps/` holds the images and `maps.js` the frames and collision grids.

**Objects were moved, not duplicated.** In a scratch copy of the Site repo the Complex (now northeast), Sofa King's lounge (now west) and the Backstage Vault (now northwest) were repositioned in the scene data and the festival re-rendered, so each exists once.

**Real links.** Gold rings open your live pages on `hungryshmorez.github.io/Site/` (EPKs, the 3D worlds, dj, lab, store, codex, links, every Midway cabinet, the Complex door row) plus Bandcamp and the Shopify store. The Jukebox lists the festival playlist from the Media site.

**Controls:** WASD / arrows / click to walk, Shift to run, E or click a station, M for the campus map, Enter to chat.

**Playable here:** basketball, shooting gallery and dunk tank (The Block), DODGE HELL (Midway), the Monkey's Paw.

Run it: open `index.html`, or `python3 -m http.server` here. In a sandboxed viewer that blocks cross-site audio, the jukebox ↗ links open the tracks instead of playing in place.
