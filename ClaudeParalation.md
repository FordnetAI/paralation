# Paralation

(Tim's section: write notes for Claude here, above the line.)

---

## Claude's working notes

### Concept brief (from Tim, Aug 15 2026)
Paralation: a play on parasite and collaboration. Top down gameplay and art in the style of Stardew Valley. Matt Ford, 18, a nerdy kid from San Diego: glasses, bad vision, small and puny, with fairly advanced leukemia. On a school trip to a forest in Arizona he picks up a weird parasite without knowing it. He goes to bed sick and wakes up strong with perfect eyesight, like Tobey Maguire's mirror scene in Spider-Man. The game opens in his bedroom the morning he wakes up changed.

### Current state (v0.5, Aug 15 2026)
- The world is now four maps: upper, lower, outside (the cul-de-sac) and garage.
- Two-floor family house, whole floor visible on one screen, fade transition on the stairs.
- Playable: title screen, wake-up intro dialogue, walk and sprint, examine objects, level up, character panel.
- Story beats seeded via examine text: meds on the nightstand, glasses left on the desk, backpack from the Arizona trip, beach photo downstairs, note from Mom on the kitchen counter.
- Second AI art pass live: all 30 furniture pieces re-imported from the 2:44 to 4:13 PM generation run (see Art upgrade pipeline below). Floors, walls, stairs, and Matt himself are still code-drawn.
- The v0.3 first-draft sprites are kept in images-v1-backup/ so any piece can be rolled back by copying one file.
- Outside: a cul-de-sac of 8 houses (Matt's plus 7 neighbours) with large yards, 96x120 tiles. Walk out the front door and the camera starts scrolling. All exterior art is code-drawn placeholder, awaiting a ComfyUI pass.
- The front door is gated on the five story beats (meds, glasses, backpack, beach photo, Mom's note). Until all five are examined Matt refuses to leave and names what is still worth a look.
- One neighbour interior is enterable: Mr. Okafor's open garage, with the weight bench payoff for the superstrength setup.

### Session log (Aug 15 2026, built with Fable)
1. v0.1: built the whole game from scratch (house, dialogue, interactables, transitions). Review workflow found and fixed 2 bugs: unreachable poster interactable, door art covering the doormat.
2. v0.2: RPG system added at Tim's request (stats, XP from first-time examines, level ups, sprint, character panel). Review found and fixed the sprint threshold flap exploit (hence the exhaustion latch).
3. Art phase: engine upgraded to 960x544 with PNG override loader, ComfyUI kit built, discovered the E:\Comfy2 to Comfy Desktop migration, rebuilt the workflow on the official Z Image Turbo template, proved it via API, review found and fixed 2 importer bugs (non-connected color keying, batch abort on bad file).
4. Tim duplicated chains in the UI to batch generations; Claude scaled that into 3 pre-filled 10-chain workflows, ran all three via API, imported all 30 assets into the game.
5. Second art pass: Tim ran the three workflows repeatedly (785 new candidates). Claude dry-ran the importer into a temp folder first to prove all 30 would key cleanly, backed up the v1 sprites, imported, and verified both floors in-game. Diagnosed the rug failure as a prompt bug rather than a bad roll.
6. v0.5, the outside: Tim scoped it as scrolling camera, one or two enterable neighbours, a gated front door, and code-drawn placeholder art. Engine got variable map sizes and a clamped camera; sprites.js got outdoor tiles, six house variants and street furniture; maps.js got the generated cul-de-sac plus the garage. Found and fixed three things during verification: the turnaround was a featureless grey slab (added the planted island), the asphalt showed 16px tile banding (per-tile wash removed), and Matt's own house was unexaminable because the only tile to stand on was the doorway portal. That last one is why PARA.audit now exists.

### Cul-de-sac layout (outside map)
- 96x120 tiles, 1536x1920px. Bulb centred on tile (48,40), pavement radius 16, sidewalk to 18, planted island radius 6 in the middle. The street runs south off the bottom edge; walking to it gets flavour text about school and the freeway, and it is the obvious hook for the next map.
- Stamping ORDER matters and is load-bearing: treeline frame, then the stem street, then the bulb discs, then the island, then driveways, then scatter. The stem is stamped before the bulb and started at the bulb's centre so the turnaround overwrites it. Stamp it after and the stem cuts a notch out of the island and drags its sidewalks across the circle.
- Houses are one 16x12-tile object each (256x192px), all facing south Pokemon-style, front door on local tiles 7-8 of the bottom row. Six variants in sprites.js: houseMatt, houseA-D, and houseOpen (the garage bay standing open). Two of them have closed garage doors.
- Trees and bushes are scattered deterministically with a sin-hash so the neighbourhood is identical every load. The scatter refuses house footprints, a keep-clear zone in front of every door, and the island; without those exclusions it walls in doorways and turns the island into a thicket.
- 8 house examines, the island, and the road out. Matt's own house rect deliberately runs one row past the house wall, because the tile in front of his door is the portal home.

### Next session quick-start (for the next Claude)
- Run the game: preview_start with launch config name "paralation" (serves via dev-server.js on port 8321), or Tim double-clicks index.html.
- GOTCHA: the Browser pane often does not composite in this environment, so requestAnimationFrame never fires and screenshots time out. Drive the game with the window.PARA debug API instead (PARA.step renders frames manually) and capture via canvas.toDataURL POSTed to the dev server's /shot endpoint. See Debug API section.
- GOTCHA when probing interactables by hand: the examine ray only reaches 14px, so Matt has to be on the tile DIRECTLY adjacent to the rect. Being one tile further out silently returns no dialogue and looks like a broken interactable. Use PARA.audit instead of guessing coordinates.
- Art iteration loop: Tim opens a paralation-* workflow in Comfy Desktop's sidebar, queues it a few times, says "imports ready"; run `python comfy/import_asset.py "E:\Comfy-Desktop\ComfyUI-Shared\output\paralation"`, reload, screenshot, review together. Newest file per asset wins; delete a bad newest raw file and re-import to fall back.
- Immediate art TODOs: rug needs a non-pink color in its prompt (root cause diagnosed, see Art upgrade pipeline); kitchen counters need to be drawn as a wall-run segment (flat front, no legs, full tile width) so a row of them butts together instead of reading as separate islands; poster prompt needs a background-margin instruction. windowW, couch and counter-consistency are all fixed as of the second pass.
- Comfy facts: verify models via http://127.0.0.1:8188/object_info, never trust the comfyui-expert skill's E:\Comfy2 inventory (see comfyui-setup memory).
- House rules: every folder needs a Claude*.md (Tim above the line, Claude below). No em dashes in Tim-facing documents. Tim likes being asked scoping questions before big builds. Combat, when it comes, is real-time, never turn-based.

### RPG system (added at Tim's request, Aug 15 2026)
- stats.js holds Matt's stat block: level, XP, strength, dexterity, intellect, speed, attack speed, stamina.
- Live now: speed drives walk pace (80 + SPD px/s), stamina fuels sprint (hold Shift, 1.6x speed, drains 8/s, regens 6/s idle, 3/s walking).
- Exhaustion latch: emptying stamina locks sprint out until it recovers to 25% of max (the STA bar turns red while locked). Added after a review agent proved the naive threshold let players flicker-sprint forever for a free 16% speed boost.
- Stored and leveling, awaiting combat: strength, dex, int, attack speed. Combat WILL be real-time action, never turn-based (Tim's rule).
- XP source for now: first-time examines give +5 XP each (the seen Set makes repeats free). 26 interactables means about level 4-5 from a full house sweep.
- Level up: every stat +1, stamina max +2, full stamina restore, celebration dialog. Curve: xpNext = 20 * 1.35^(level-1).
- UI: C or Tab opens the character panel (portrait, level, XP bar, stat bars). Stamina HUD bar bottom-left when not full. Gold "+5 XP" floats over Matt's head on new examines.

### Files
- index.html: page shell, loads the four scripts below. Open directly in a browser, no build step.
- sprites.js: code-drawn fallback art (pixel-string character sprites, procedural tiles and furniture). Furniture is now usually overridden by PNGs in images/; character, tiles, walls still come from here.
- maps.js: floor layouts, furniture placement, interactables, portals. The two house floors and the garage are literal character grids. `outside` is different: it ships a `build()` that GENERATES its grid, because a 96x120 literal would be 11,520 characters and impossible to keep aligned by hand. buildFloor calls build() once and caches the result onto the map object.
- game.js: game loop, input, collision, dialogue system, floor transitions, stats panel and HUD rendering, PNG override loader, PARA debug API.
- stats.js: Matt's RPG stat block, XP and level curve, walk speed formula.
- images/: hi-res (32px per tile) PNG sprite overrides, produced by the importer. Each is exactly 2x its code sprite's size.
- images-v1-backup/: the v0.3 first-draft sprites, kept for rollback. Not loaded by the game. Copy a file back into images/ to revert one piece.
- .claude/launch.json: launch config named "paralation" so preview_start boots dev-server.js on port 8321.
- comfy/: ComfyUI generation kit. make_workflows.py (source of truth, generates and installs the three batch workflows), paralation-*-*.json (UI format) and .api.json (for API queueing), import_asset.py (raw output to game sprite), PROMPTS.md (how to run, per-item prompts).
- shots/: screenshot output folder for the dev server, safe to empty.
- dev-server.js: optional dev tool, not part of the game. `node dev-server.js <gameDir> <shotDir> <port>` serves the game and accepts POST /shot?name=x with a canvas dataURL to save PNG screenshots (used for automated visual testing). Wired into the workspace .claude\launch.json as "paralation".

### Debug API (window.PARA)
Defined at the bottom of game.js, for testing without live keyboard/rAF:
- `PARA.step(dt, n)`: run n update+render frames manually.
- `PARA.press(code)` / `PARA.hold(code, down)`: simulate key events ('KeyE', 'KeyW', 'Space', ...).
- `PARA.get()`: current state, floor, position, facing, active dialogue line.
- `PARA.set({x, y, dir})`: teleport the player. Does NOT check collision, so it can strand Matt inside a wall; prefer `PARA.warp` for jumping around.
- `PARA.warp(floorId, x, y)`: jump straight to another floor without walking a portal.
- `PARA.openGate()`: mark the five front-door story beats as seen, so the door opens without sweeping the house.
- `PARA.cam()`: current camera offset and the map's pixel size.
- `PARA.audit(floorId)`: map sanity check, returns [] when clean. Flags interactables with no tile you can stand on to reach them, and portals that land in solid geometry. RUN THIS AFTER ANY MAP EDIT: the unreachable-interactable bug has now shipped twice (the v0.1 poster, and Matt's own house in v0.5, whose only examine tile was the doorway portal).
- `PARA.overview(scale)`: dataURL PNG of the entire current floor, background plus depth-sorted objects. This is how you review a scrolling map's layout without walking it.

### Art upgrade pipeline (32px, started Aug 15 2026)
- Tim wants a 16-bit to 32-bit look. Canvas is now 960x544 physical; ALL game logic stays in logical 480x272 coordinates with a 2x setTransform in render() and in background building. Code-drawn art renders identical to before.
- PNG overrides: the game tries `images/<objectName>.png` for every object at boot. A present file (exactly 2x the code sprite's size) replaces that sprite; missing files fall back to code art. Furniture upgrades piece by piece, the game never breaks.
- Generation: three batch workflows in Comfy Desktop's Workflows sidebar (paralation-1-bedroom, paralation-2-living, paralation-3-kitchen-bath), each with ~10 pre-filled prompt chains sharing one Z Image Turbo loader stack. One queue press generates a candidate for ten assets. Regenerate them anytime with comfy/make_workflows.py (edits to prompts or grouping go in that script's WORKFLOWS table). Style is prompt-driven, no LoRA. Outputs land in E:\Comfy-Desktop\ComfyUI-Shared\output\paralation\.
- Status Aug 15 2026: SECOND art pass DONE. Tim generated 785 more candidates between 2:44 and 4:13 PM (every asset got 16 to 32 fresh variants, the bed got 125). All 30 were re-imported. Nothing failed keying, every sprite came out at its exact 2x size, and both floors were verified in-game.
- Fixed by the second pass: couch now reads as a two-seat couch instead of an armchair, windowW reads as a window with sky, the three kitchen counters finally match each other, rug2 lost the blob in its middle, sinkP lost a floating-box artifact.
- Still weak after the second pass: rug (see the pink-on-pink prompt bug below) and the kitchen counters read as freestanding islands with legs rather than a continuous counter run against the wall.
- Backgrounds are now PINK, not the magenta the prompt asks for. This does not matter to the importer, which corner-samples whatever background color it finds, but it is what causes the rug bug.
- Prompt bug, rug: FIXED IN THE PROMPT, NOT YET REGENERATED. The old prompt asked for a "salmon pink area rug" on a "plain magenta background", so the model painted a pink object on a pink field and the corner-key had nothing to separate. All 19 candidates were unusable. rug2 ("cream center with burgundy border") came out great, which confirmed contrast was the fix. The rug is now prompted as "navy blue and cream braided area rug". Tim needs to queue paralation-2-living once and re-import to see it. General rule for future prompts: never name a pink, magenta or salmon object, the background is pink.
- Keying hazard, poster: the poster prompt asks for a "dark blue background", and in about half the candidates that navy bleeds all the way to the image edge. When it does, the corner-key deletes the poster rectangle and leaves a rocket floating with no poster. poster_00017_ happened to keep a pink margin so the current import is correct, but this one is luck-of-the-draw. Fix is to ask for a small poster with clear background margin around it.
- The importer takes the newest file per asset name, so queue new variants and re-import to iterate. To pick a specific older candidate without deleting anything, import that one file by hand: `python comfy/import_asset.py "<folder>\rug_00016_.png" rug`.
- Import: `python comfy/import_asset.py <folder>` keys out the background (corner-sampled, so white OR magenta works), crops, pixelizes to exact target size, quantizes to 32 colors, anchors bottom-center, writes into images/.
- Caveat: over file:// a loaded image taints the canvas, which only breaks toDataURL (the PARA screenshot tooling). Play is unaffected; use the dev server for screenshot work.
- Not yet upgraded: floors/walls/stairs (phase 2), Matt's sprite (stays hand-built), portraits and title art (phase 3, the thing AI is best at).

### Tech decisions
- Vanilla JS, plain script tags (no modules) so double-clicking index.html works from disk.
- The VIEWPORT is 480x272 logical (30x17 tiles of 16px). The canvas is 960x544 physical with a 2x setTransform, so hi-res PNGs land 1:1 while code art stays chunky. CSS scales the canvas to the window with pixelated rendering.
- Maps are no longer locked to the viewport. buildFloor reads its size from the grid it is given, and each floor caches mw/mh/pw/ph. Interiors happen to be exactly one screen, so their camera pins at 0 and they render exactly as they did before the camera existed.
- Camera: centred on Matt and clamped to the map, so it never shows past an edge. render() translates by -cam for world drawing and translates back before the HUD, dialog, stamina bar and fade, which all stay in screen space. The background is blitted as a source sub-rect rather than drawn whole, and entities are culled to the viewport before the depth sort.
- Because the camera never shows past a map edge, the outdoor map only needs a solid border rather than pretty edge handling: the 'X' treeline char renders as ground but blocks movement.
- Tile chars: A-F are walls drawn by SPR.wall (F is the garage's bare gray), 'X' is solid scenery drawn by SPR.floor, everything else is walkable ground. Outside adds G grass, R asphalt, S sidewalk, V driveway, c concrete slab.
- Character: pixel-string sprite sheets built from text grids in sprites.js, easy to hand-edit.

### Controls
- Move: WASD or arrows. Sprint: hold Shift. Interact: E, Space, or Enter. Character panel: C or Tab. Any key advances dialogue.

### Direction notes from Tim (Aug 15 2026)
- Original Pokemon Red and Blue (Game Boy) is a partial inspiration: single-screen interior maps, transitions on stairs and doors, examine-everything flavor text.
- EXCEPT battles: Tim hates turn-based combat. Any future combat must be real-time action.

### Roadmap ideas (not built)
- NPCs. This is now the biggest gap: the cul-de-sac is convincing but empty, and it is the reason only the garage is enterable rather than a neighbour's living room. An empty house interior reads as a bug, an empty street on a Saturday morning reads as a Saturday morning.
- Beyond the cul-de-sac: the road south is already stubbed with flavour text. Street, neighbourhood, school.
- The parasite as a character: voice in Matt's head, the "collaboration" mechanic.
- Parents as NPCs, day cycle, save system (stats and seen-set currently reset on reload).
- Art phase 2: floors, walls, stairs (seamless texture pipeline), and now the exteriors too, which are all placeholder code art. Art phase 3: dialogue portraits and title art, the highest wow-per-effort AI target.
- Combat: real-time action using the stored str/dex/aspd stats. Never turn-based.
