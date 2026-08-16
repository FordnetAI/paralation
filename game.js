// ============================================================
// Paralation - game.js
// Game loop, input, collision, dialogue, floor transitions.
// States: title -> fadein -> dialog (intro) -> play
//         play <-> warpout/warpin (stairs)
// ============================================================
(() => {
  const T = 16, VW = 480, VH = 272;
  const cv = document.getElementById('game');
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;

  // ---------------- input ----------------
  const keys = {};
  let pressQ = [];
  const MOVE = {
    ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1],
    ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0],
  };
  addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) e.preventDefault();
    if (!e.repeat) pressQ.push(e.code);
    keys[e.code] = true;
  });
  addEventListener('keyup', (e) => { keys[e.code] = false; });
  cv.addEventListener('pointerdown', () => pressQ.push('Pointer'));
  const ACT = ['KeyE', 'Space', 'Enter', 'Pointer'];
  function pressed(codes) { return pressQ.some((c) => codes.includes(c)); }

  // ---------------- state ----------------
  let state = 'title', floorId = 'upper', fadeA = 1, warpCd = 0;
  const player = { x: 72, y: 88, dir: 'down', moving: false, animT: 0 };
  let dialog = null;   // {lines, i, chars, onEnd}
  let toast = null;    // {text, t}
  let pendingWarp = null;
  let levelQueue = []; // levels reached, waiting to show their level-up dialog
  let xpPops = [];     // floating "+N XP" markers
  let sprinting = false;
  let exhausted = false; // latch: empty stamina blocks sprint until 25% recovery
  const seen = new Set(); // interactables already examined (XP is first-time only)

  // The front door is gated on the five story beats the house seeds, so Matt
  // cannot wander outside before the game has told the player why he would not.
  // Keys are the same floorId:index strings the `seen` set uses for XP.
  const GATE = [
    ['upper:1', 'the pill bottle on my nightstand'],
    ['upper:5', 'my glasses on the desk'],
    ['upper:6', 'my pack from the trip'],
    ['lower:4', 'the beach photo'],
    ['lower:7', 'the note from Mom'],
  ];
  function gateLeft() { return GATE.filter((k) => !seen.has(k[0])); }

  // ---------------- world building ----------------
  // WALLS render through SPR.wall (interior wallpaper + baseboard).
  // BLOCK chars render through SPR.floor like ground but still stop the player,
  // which is how the outdoor map fences itself in with a treeline instead of void.
  const WALLS = 'ABCDEF';
  const BLOCK = 'X';
  const world = {};
  function solidChar(ch) { return ch === '.' || WALLS.includes(ch) || BLOCK.includes(ch); }
  function buildFloor(id) {
    const m = MAPS[id];
    // a map may ship a literal `ground` grid or a build() that generates one
    if (!m.ground && m.build) Object.assign(m, m.build());
    const MH = m.ground.length, MW = m.ground[0].length;
    const solid = [];
    for (let y = 0; y < MH; y++) {
      solid[y] = [];
      for (let x = 0; x < MW; x++) solid[y][x] = solidChar(m.ground[y][x]);
    }
    // backgrounds are built at 2x physical resolution; logical coords stay 1x
    const bg = SPR.cnv(MW * T * 2, MH * T * 2);
    const b = bg.getContext('2d');
    b.imageSmoothingEnabled = false;
    b.setTransform(2, 0, 0, 2, 0, 0);
    b.fillStyle = '#0a0910'; b.fillRect(0, 0, MW * T, MH * T);
    for (let y = 0; y < MH; y++) {
      for (let x = 0; x < MW; x++) {
        const ch = m.ground[y][x];
        if (ch === '.') continue;
        if (WALLS.includes(ch)) {
          const below = y < MH - 1 ? m.ground[y + 1][x] : '.';
          const above = y > 0 ? m.ground[y - 1][x] : '.';
          SPR.wall(b, x * T, y * T, ch, !(WALLS.includes(below) || below === '.'), above === '.');
        } else {
          SPR.floor(b, x * T, y * T, ch, x, y);
        }
      }
    }
    // draws code art at logical size, or a loaded hi-res PNG into the same
    // logical rect (the 2x transform makes its pixels land 1:1 physically)
    const drawObj = (ctx, o, dx, dy) => {
      if (o.hi) ctx.drawImage(o.hi, dx, dy, o.w, o.h);
      else ctx.drawImage(o.img, dx, dy);
    };
    // Which inter rect (if any) an object's footprint sits on. Objects that
    // match one get a proximity glow, so the player can find things to examine.
    // Returns the rect's index because the glow keys off the `seen` set.
    const inters = m.inter || [];
    const hotFor = (tx, ty, fw, fh) => {
      for (let i = 0; i < inters.length; i++) {
        const it = inters[i];
        if (tx < it.x + it.w && tx + fw > it.x && ty < it.y + it.h && ty + fh > it.y) {
          return { cx: (tx + fw / 2) * T, cy: (ty + fh / 2) * T, idx: i };
        }
      }
      return null;
    };
    // Baked-in art (wall art and floor flats) lives in the background image, so
    // it cannot glow from the entity pass. Anything interactable gets recorded
    // here and redrawn with a halo before the entity pass instead.
    const hotArt = [];
    // wall art first, so floor-level flats (rugs, mats) always draw over it
    for (const [t, tx, ty] of (m.wallArt || [])) {
      const o = SPR.OBJ[t];
      if (!o) { console.warn('missing wall art type: ' + t); continue; }
      const dx = tx * T + ((o.fw * T - o.w) >> 1), dy = ty * T + (o.dy || 0);
      drawObj(b, o, dx, dy);
      const hot = hotFor(tx, ty, o.fw, o.fh);
      if (hot) hotArt.push({ o: o, x: dx, y: dy, hot: hot });
    }
    const entities = [];
    for (const [t, tx, ty] of m.objects) {
      const o = SPR.OBJ[t];
      if (!o) { console.warn('missing object type: ' + t); continue; }
      const dx = tx * T + ((o.fw * T - o.w) >> 1);
      const dy = (ty + o.fh) * T - o.h;
      const hot = hotFor(tx, ty, o.fw, o.fh);
      if (o.flat) {
        drawObj(b, o, dx, dy);
        if (hot) hotArt.push({ o: o, x: dx, y: dy, hot: hot });
      } else {
        entities.push({
          o: o, img: o.img, x: dx, y: dy, base: (ty + o.fh) * T,
          fw: o.fw, hot: hot,
        });
      }
      if (o.solid !== false && !o.flat) {
        for (let yy = ty; yy < ty + o.fh; yy++) {
          for (let xx = tx; xx < tx + o.fw; xx++) {
            if (yy >= 0 && yy < MH && xx >= 0 && xx < MW) solid[yy][xx] = true;
          }
        }
      }
    }
    world[id] = {
      solid: solid, bg: bg, entities: entities, inter: m.inter, portals: m.portals,
      hotArt: hotArt, mw: MW, mh: MH, pw: MW * T, ph: MH * T,
    };
  }
  const FLOORS = ['upper', 'lower', 'outside', 'garage'];
  function buildAll() { for (const id of FLOORS) buildFloor(id); }
  buildAll();

  // hi-res PNG overrides: images/<type>.png (2x the code-art size) replaces
  // any code-drawn sprite. Missing files fall back silently; when the last
  // image settles, rebuild backgrounds so flats/wall art pick up overrides.
  let imgPending = 0, imgLoaded = 0;
  for (const name in SPR.OBJ) {
    const img = new Image();
    imgPending++;
    const done = () => { if (--imgPending === 0 && imgLoaded > 0) buildAll(); };
    img.onload = () => { SPR.OBJ[name].hi = img; imgLoaded++; done(); };
    img.onerror = done;
    img.src = 'images/' + name + '.png';
  }

  // ---------------- collision ----------------
  function solidAt(px, py) {
    const w = world[floorId];
    const tx = Math.floor(px / T), ty = Math.floor(py / T);
    if (tx < 0 || tx >= w.mw || ty < 0 || ty >= w.mh) return true;
    return w.solid[ty][tx];
  }

  // ---------------- examine glow ----------------
  // Interactable objects light up as Matt approaches, so hunting for the next
  // thing to look at is a matter of walking around rather than mashing E at
  // every wall. Range is about ten feet: tiles read as roughly 3ft here, so
  // four tiles. Things already examined stop glowing, which turns the glow
  // into a to-do list rather than permanent Christmas lights.
  const GLOW_R = 64;
  function glowAt(hot) {
    if (!hot) return 0;
    if (seen.has(floorId + ':' + hot.idx)) return 0;
    const dx = player.x - hot.cx, dy = player.y - hot.cy;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > GLOW_R) return 0;
    const near = Math.min(1, (1 - d / GLOW_R) * 1.4);
    return near * (0.72 + 0.28 * Math.sin(performance.now() / 240));
  }
  // Draws a sprite with a warm halo around its silhouette. The repeated passes
  // are the point: canvas shadows stack, and a single pass is nearly invisible
  // against a warm wood floor. Three reads clearly without blowing out.
  function drawHalo(o, img, x, y, a) {
    g.shadowColor = 'rgba(255,236,158,' + Math.min(1, a).toFixed(3) + ')';
    g.shadowBlur = 7 + a * 13;
    for (let i = 0; i < 3; i++) {
      if (o && o.hi) g.drawImage(o.hi, x, y, o.w, o.h);
      else g.drawImage(img, x, y);
    }
    g.shadowBlur = 0;
  }

  // ---------------- camera ----------------
  // Interiors are exactly one screen, so their camera stays pinned at 0 and they
  // render byte-for-byte as before. Only maps larger than the viewport scroll.
  let camX = 0, camY = 0;
  function updateCamera() {
    const w = world[floorId];
    camX = w.pw <= VW ? 0 : Math.max(0, Math.min(w.pw - VW, Math.round(player.x - VW / 2)));
    camY = w.ph <= VH ? 0 : Math.max(0, Math.min(w.ph - VH, Math.round(player.y - VH / 2)));
  }
  function boxFree(x, y) {
    return !solidAt(x - 5, y - 3) && !solidAt(x + 4, y - 3) &&
           !solidAt(x - 5, y + 3) && !solidAt(x + 4, y + 3);
  }

  // ---------------- dialogue ----------------
  function openDialog(lines, onEnd) {
    dialog = { lines: lines, i: 0, chars: 0, onEnd: onEnd };
    state = 'dialog';
  }
  function advanceDialog() {
    const line = dialog.lines[dialog.i];
    if (dialog.chars < line.length) { dialog.chars = line.length; return; }
    dialog.i++; dialog.chars = 0;
    if (dialog.i >= dialog.lines.length) {
      const cb = dialog.onEnd;
      dialog = null; state = 'play';
      if (cb) cb();
    }
  }

  // ---------------- update ----------------
  function update(dt) {
    if (toast) { toast.t -= dt; if (toast.t <= 0) toast = null; }
    for (const p of xpPops) { p.t -= dt; p.y -= 12 * dt; }
    xpPops = xpPops.filter((p) => p.t > 0);

    if (state === 'title') {
      if (pressQ.length) { state = 'fadein'; fadeA = 1; }

    } else if (state === 'fadein') {
      fadeA = Math.max(0, fadeA - dt * 1.2);
      if (fadeA <= 0) {
        openDialog(MAPS.intro, () => {
          toast = { text: 'WASD move · Shift run · E look · C stats', t: 8 };
        });
      }

    } else if (state === 'dialog') {
      const line = dialog.lines[dialog.i];
      if (dialog.chars < line.length) dialog.chars += dt * 55;
      if (pressed(ACT)) advanceDialog();

    } else if (state === 'play') {
      if (levelQueue.length) {
        const lv = levelQueue.shift();
        openDialog([
          'LEVEL UP! Matt reached level ' + lv + '.',
          'STR +1 · DEX +1 · INT +1 · SPD +1 · ATK SPD +1 · STAMINA +2. Fully rested.',
        ]);
        return;
      }
      if (pressed(['KeyC', 'Tab'])) { state = 'stats'; return; }
      let dx = 0, dy = 0;
      for (const k in MOVE) if (keys[k]) { dx += MOVE[k][0]; dy += MOVE[k][1]; }
      dx = Math.sign(dx); dy = Math.sign(dy);
      player.moving = !!(dx || dy);
      if (STATS.s.sta <= 0.5) exhausted = true;
      else if (STATS.s.sta >= STATS.s.staMax * 0.25) exhausted = false;
      sprinting = !!(player.moving && (keys.ShiftLeft || keys.ShiftRight) && !exhausted);
      if (player.moving) {
        if (dy < 0) player.dir = 'up'; else if (dy > 0) player.dir = 'down';
        if (dx < 0) player.dir = 'left'; else if (dx > 0) player.dir = 'right';
        const sp = STATS.walkSpeed() * (sprinting ? 1.6 : 1) * dt * (dx && dy ? 0.7071 : 1);
        const nx = player.x + dx * sp;
        if (boxFree(nx, player.y)) player.x = nx;
        const ny = player.y + dy * sp;
        if (boxFree(player.x, ny)) player.y = ny;
        player.animT += dt * (sprinting ? 1.6 : 1);
      } else {
        player.animT = 0;
      }
      if (sprinting) STATS.s.sta = Math.max(0, STATS.s.sta - 8 * dt);
      else STATS.s.sta = Math.min(STATS.s.staMax, STATS.s.sta + (player.moving ? 3 : 6) * dt);
      warpCd = Math.max(0, warpCd - dt);
      if (warpCd <= 0) {
        for (const p of world[floorId].portals) {
          if (player.x >= p.x && player.x < p.x + p.w && player.y >= p.y && player.y < p.y + p.h) {
            if (p.gate) {
              const left = gateLeft();
              if (left.length) {
                warpCd = 1.2;
                openDialog([
                  'I need to figure out what is inside me before I walk out that door.',
                  'Still worth a look: ' + left.map((k) => k[1]).join(', ') + '.',
                ]);
                break;
              }
            }
            pendingWarp = p; state = 'warpout'; break;
          }
        }
      }
      if (state === 'play' && pressed(ACT)) {
        const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[player.dir];
        const tx = Math.floor((player.x + d[0] * 14) / T);
        const ty = Math.floor((player.y + d[1] * 14) / T);
        const inters = world[floorId].inter;
        for (let ii = 0; ii < inters.length; ii++) {
          const it = inters[ii];
          if (tx >= it.x && tx < it.x + it.w && ty >= it.y && ty < it.y + it.h) {
            const key = floorId + ':' + ii;
            if (!seen.has(key)) {
              seen.add(key);
              xpPops.push({ text: '+5 XP', t: 1.3, x: player.x, y: player.y - 26 });
              for (const lv of STATS.grant(5)) levelQueue.push(lv);
            }
            openDialog(it.lines); break;
          }
        }
      }

    } else if (state === 'stats') {
      if (pressed(['KeyC', 'Tab', 'Escape', 'KeyE', 'Space', 'Enter', 'Pointer'])) state = 'play';

    } else if (state === 'warpout') {
      fadeA = Math.min(1, fadeA + dt * 2.5);
      if (fadeA >= 1) {
        const p = pendingWarp;
        floorId = p.to; player.x = p.dx; player.y = p.dy; player.dir = p.face;
        warpCd = 0.6; pendingWarp = null; state = 'warpin';
      }

    } else if (state === 'warpin') {
      fadeA = Math.max(0, fadeA - dt * 2.5);
      if (fadeA <= 0) state = 'play';
    }
  }

  // ---------------- render ----------------
  function wrapText(txt, x, y, maxW, lh) {
    const words = txt.split(' ');
    let line = '', yy = y;
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (g.measureText(t).width > maxW && line) { g.fillText(line, x, yy); yy += lh; line = w; }
      else line = t;
    }
    g.fillText(line, x, yy);
  }

  function renderDialog() {
    const bx = 6, by = VH - 70, bw = VW - 12, bh = 64;
    g.fillStyle = '#f8e7bb'; g.fillRect(bx, by, bw, bh);
    g.fillStyle = '#8a5b2b';
    g.fillRect(bx, by, bw, 2); g.fillRect(bx, by + bh - 2, bw, 2);
    g.fillRect(bx, by, 2, bh); g.fillRect(bx + bw - 2, by, 2, bh);
    g.fillStyle = '#e7d0a0'; g.fillRect(bx + 2, by + 2, bw - 4, 2);
    // portrait
    g.fillStyle = '#efd9a8'; g.fillRect(bx + 6, by + 8, 48, 48);
    g.fillStyle = '#8a5b2b';
    g.fillRect(bx + 6, by + 8, 48, 1); g.fillRect(bx + 6, by + 55, 48, 1);
    g.fillRect(bx + 6, by + 8, 1, 48); g.fillRect(bx + 53, by + 8, 1, 48);
    g.drawImage(SPR.matt.down[0], 0, 0, 16, 12, bx + 6, by + 11, 48, 36);
    g.fillStyle = '#6b3f16'; g.font = 'bold 7px monospace'; g.textAlign = 'center';
    g.fillText('MATT', bx + 30, by + 53);
    g.textAlign = 'left';
    // text
    const line = dialog.lines[dialog.i];
    const shown = line.slice(0, Math.floor(dialog.chars));
    g.fillStyle = '#40260f'; g.font = '9px monospace';
    wrapText(shown, bx + 62, by + 16, bw - 62 - 14, 12);
    if (dialog.chars >= line.length && ((performance.now() / 400) | 0) % 2) {
      g.fillText('▼', bx + bw - 16, by + bh - 8);
    }
  }

  function bar(x, y, w, h, frac, fill) {
    g.fillStyle = '#d9c391'; g.fillRect(x, y, w, h);
    g.fillStyle = fill; g.fillRect(x, y, Math.round(w * Math.max(0, Math.min(1, frac))), h);
    g.fillStyle = '#8a5b2b';
    g.fillRect(x - 1, y - 1, w + 2, 1); g.fillRect(x - 1, y + h, w + 2, 1);
    g.fillRect(x - 1, y - 1, 1, h + 2); g.fillRect(x + w, y - 1, 1, h + 2);
  }

  function renderStamina() {
    g.fillStyle = 'rgba(18,14,26,0.7)'; g.fillRect(6, VH - 20, 78, 14);
    g.fillStyle = '#cfe8d2'; g.font = '7px monospace'; g.fillText('STA', 10, VH - 10);
    bar(28, VH - 16, 48, 6, STATS.s.sta / STATS.s.staMax, exhausted ? '#c05a40' : '#57ae6a');
  }

  function renderStatsPanel() {
    const s = STATS.s, pw = 240, ph = 204, px = (VW - pw) / 2, py = (VH - ph) / 2 - 2;
    g.fillStyle = 'rgba(5,4,10,0.55)'; g.fillRect(0, 0, VW, VH);
    g.fillStyle = '#f8e7bb'; g.fillRect(px, py, pw, ph);
    g.fillStyle = '#8a5b2b';
    g.fillRect(px, py, pw, 2); g.fillRect(px, py + ph - 2, pw, 2);
    g.fillRect(px, py, 2, ph); g.fillRect(px + pw - 2, py, 2, ph);
    g.fillStyle = '#e7d0a0'; g.fillRect(px + 2, py + 2, pw - 4, 2);
    g.drawImage(SPR.matt.down[0], 0, 0, 16, 12, px + 12, py + 12, 36, 27);
    g.fillStyle = '#40260f'; g.font = 'bold 10px monospace';
    g.fillText('MATT FORD', px + 58, py + 22);
    g.font = '8px monospace'; g.fillStyle = '#6b3f16';
    g.fillText('Level ' + s.level, px + 58, py + 34);
    g.fillStyle = '#40260f';
    g.fillText('XP', px + 12, py + 52);
    bar(px + 32, py + 45, 108, 8, s.xp / STATS.xpNext(), '#7fae57');
    g.fillText(s.xp + ' / ' + STATS.xpNext(), px + 152, py + 52);
    const rows = [
      ['STRENGTH', s.str], ['DEXTERITY', s.dex], ['INTELLECT', s.int],
      ['SPEED', s.spd], ['ATK SPEED', s.aspd],
    ];
    let ry = py + 72;
    for (const [name, val] of rows) {
      g.fillStyle = '#40260f'; g.fillText(name, px + 12, ry + 7);
      bar(px + 96, ry, 90, 7, val / 30, '#c98a3d');
      g.textAlign = 'right'; g.fillStyle = '#40260f';
      g.fillText(String(val), px + pw - 14, ry + 7); g.textAlign = 'left';
      ry += 17;
    }
    g.fillStyle = '#40260f'; g.fillText('STAMINA', px + 12, ry + 7);
    bar(px + 96, ry, 90, 7, s.sta / s.staMax, '#57ae6a');
    g.textAlign = 'right'; g.fillText(Math.round(s.sta) + '/' + s.staMax, px + pw - 14, ry + 7);
    g.textAlign = 'center'; g.fillStyle = '#8a7040';
    g.fillText('C to close', px + pw / 2, py + ph - 10);
    g.textAlign = 'left';
  }

  function renderToast() {
    g.font = '8px monospace';
    const w = g.measureText(toast.text).width + 16;
    const x = (VW - w) / 2;
    g.fillStyle = 'rgba(18,14,26,0.85)';
    g.fillRect(x, 8, w, 16);
    g.fillStyle = '#f8e7bb'; g.textAlign = 'center';
    g.fillText(toast.text, VW / 2, 19);
    g.textAlign = 'left';
  }

  function renderTitle() {
    g.fillStyle = '#0b0a12'; g.fillRect(0, 0, VW, VH);
    g.drawImage(SPR.para, 0, 0, 16, 16, VW / 2 - 32, 42, 64, 64);
    g.textAlign = 'center';
    g.fillStyle = '#8fd06a'; g.font = 'bold 30px monospace';
    g.fillText('PARALATION', VW / 2, 148);
    g.fillStyle = '#9a94b8'; g.font = '10px monospace';
    g.fillText('it grows on you', VW / 2, 168);
    if (((performance.now() / 500) | 0) % 2) {
      g.fillStyle = '#f8e7bb'; g.font = '9px monospace';
      g.fillText('press any key', VW / 2, 218);
    }
    g.fillStyle = '#3a3650'; g.font = '7px monospace';
    g.textAlign = 'right'; g.fillText('v0.5', VW - 6, VH - 6);
    g.textAlign = 'left';
  }

  function render() {
    g.setTransform(2, 0, 0, 2, 0, 0); // logical 480x272 onto the 960x544 canvas
    if (state === 'title') { renderTitle(); pressQ = []; return; }
    const w = world[floorId];
    updateCamera();
    g.translate(-camX, -camY);
    // blit only the visible slice of the background; source coords are physical
    // (the bg canvas is 2x), dest coords are logical, so it lands 1:1 unscaled
    g.drawImage(w.bg, camX * 2, camY * 2, VW * 2, VH * 2, camX, camY, VW, VH);
    // depth-sorted furniture + player, culled to the viewport (+1 screen of
    // margin so tall sprites like house roofs are not popped off at the edge)
    const list = [];
    for (const e of w.entities) {
      if (e.x > camX + VW + 8 || e.x + e.o.w < camX - 8) continue;
      if (e.y > camY + VH + 8 || e.y + e.o.h < camY - 8) continue;
      list.push(e);
    }
    // Halos for interactables baked into the background (wall art, rugs).
    // Redrawing the same pixels is invisible; only the shadow spills out. Done
    // before the entity pass so Matt still walks in front of them.
    for (const h of w.hotArt) {
      const a = glowAt(h.hot);
      if (a > 0) drawHalo(h.o, h.o.img, h.x, h.y, a);
    }
    // Contact shadows, as their own pass so no object's shadow ever lands on
    // top of another object's sprite. Smoothing is enabled just for these:
    // nearest-neighbour scaling would band the gradient into hard rings.
    g.imageSmoothingEnabled = true;
    for (const e of list) {
      // height is capped: uncapped, a 16-tile house gets a 96px-deep blob
      const sw = e.fw * T * 1.05, sh = Math.min(24, Math.max(6, sw * 0.36));
      g.drawImage(SPR.shadow, e.x + e.o.w / 2 - sw / 2, e.base - sh / 2 - 1, sw, sh);
    }
    g.imageSmoothingEnabled = false;

    const frames = SPR.matt[player.dir];
    const idx = player.moving ? [1, 0, 2, 0][Math.floor(player.animT * 6) % 4] : 0;
    list.push({
      img: frames[idx],
      x: Math.round(player.x) - 8, y: Math.round(player.y) - 19,
      base: player.y + 3, isPlayer: true,
    });
    list.sort((a, b) => a.base - b.base);
    for (const e of list) {
      if (e.hot) {
        const glow = glowAt(e.hot);
        if (glow > 0) drawHalo(e.o, e.img, e.x, e.y, glow);
      }
      if (e.isPlayer) {
        g.globalAlpha = 0.18; g.fillStyle = '#000';
        g.beginPath();
        g.ellipse(Math.round(player.x), Math.round(player.y) + 2, 6, 3, 0, 0, Math.PI * 2);
        g.fill();
        g.globalAlpha = 1;
      }
      if (e.o && e.o.hi) g.drawImage(e.o.hi, e.x, e.y, e.o.w, e.o.h);
      else g.drawImage(e.img, e.x, e.y);
    }
    g.font = 'bold 8px monospace'; g.textAlign = 'center';
    for (const p of xpPops) {
      g.fillStyle = 'rgba(40,26,8,0.5)'; g.fillText(p.text, Math.round(p.x) + 1, Math.round(p.y) + 1);
      g.fillStyle = '#ffd45a'; g.fillText(p.text, Math.round(p.x), Math.round(p.y));
    }
    g.textAlign = 'left';
    g.translate(camX, camY); // back to screen space: HUD, dialog and fade do not scroll
    if (state === 'play' && (sprinting || STATS.s.sta < STATS.s.staMax)) renderStamina();
    if (state === 'stats') renderStatsPanel();
    if (dialog) renderDialog();
    if (toast) renderToast();
    if (fadeA > 0) { g.fillStyle = 'rgba(5,4,10,' + fadeA + ')'; g.fillRect(0, 0, VW, VH); }
    pressQ = [];
  }

  // ---------------- main loop ----------------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Debug/testing hooks: lets tools (and future automated tests) drive the
  // game without a live requestAnimationFrame, simulate input, and inspect state.
  window.PARA = {
    step: (dt, n) => { n = n || 1; for (let i = 0; i < n; i++) { update(dt || 0.016); render(); } },
    press: (code) => { pressQ.push(code); },
    hold: (code, down) => { keys[code] = down !== false; },
    get: () => ({
      state: state, floor: floorId, x: player.x, y: player.y, dir: player.dir,
      fade: fadeA, dialog: dialog ? dialog.lines[dialog.i] : null,
      stats: Object.assign({}, STATS.s), seen: seen.size, exhausted: exhausted,
    }),
    set: (p) => { Object.assign(player, p); },
    grantXp: (n) => { for (const lv of STATS.grant(n)) levelQueue.push(lv); },
    // jump straight to a floor without walking a portal, for screenshot tests
    warp: (to, x, y) => {
      floorId = to; state = 'play'; fadeA = 0; dialog = null; warpCd = 0.8;
      if (x !== undefined) { player.x = x; player.y = y; }
      updateCamera();
    },
    // satisfy the front-door gate without sweeping the whole house
    openGate: () => { for (const k of GATE) seen.add(k[0]); },
    cam: () => ({ x: camX, y: camY, mw: world[floorId].pw, mh: world[floorId].ph }),
    // Map sanity check. Catches the two mistakes that have actually shipped:
    // an interactable with no tile you can stand on to reach it, and a portal
    // that drops you inside solid geometry. Returns [] when a floor is clean.
    audit: (id) => {
      const w = world[id || floorId];
      const probs = [];
      const portalAt = (tx, ty) => w.portals.some((p) =>
        tx * T + 8 >= p.x && tx * T + 8 < p.x + p.w &&
        ty * T + 8 >= p.y && ty * T + 8 < p.y + p.h);
      const walkable = (tx, ty) =>
        tx >= 0 && tx < w.mw && ty >= 0 && ty < w.mh && !w.solid[ty][tx];
      w.inter.forEach((it, i) => {
        let ok = false;
        for (let ty = it.y; ty < it.y + it.h && !ok; ty++) {
          for (let tx = it.x; tx < it.x + it.w && !ok; tx++) {
            for (const [sx, sy] of [[tx, ty + 1], [tx, ty - 1], [tx + 1, ty], [tx - 1, ty]]) {
              if (walkable(sx, sy) && !portalAt(sx, sy)) { ok = true; break; }
            }
          }
        }
        if (!ok) probs.push('UNREACHABLE inter #' + i + ' @' + it.x + ',' + it.y +
          ' "' + it.lines[0].slice(0, 44) + '"');
      });
      w.portals.forEach((p, i) => {
        const d = world[p.to];
        if (!d) { probs.push('portal #' + i + ' -> unknown floor ' + p.to); return; }
        const tx = Math.floor(p.dx / T), ty = Math.floor(p.dy / T);
        if (tx < 0 || tx >= d.mw || ty < 0 || ty >= d.mh || d.solid[ty][tx]) {
          probs.push('portal #' + i + ' -> ' + p.to + ' lands in solid at tile ' + tx + ',' + ty);
        }
      });
      return probs;
    },
    // whole-floor overview PNG, for reviewing map layout without walking it
    overview: (scale) => {
      const w = world[floorId];
      scale = scale || 0.25;
      const c = SPR.cnv(Math.round(w.pw * scale), Math.round(w.ph * scale));
      const x = c.getContext('2d');
      x.imageSmoothingEnabled = false;
      x.setTransform(scale, 0, 0, scale, 0, 0);
      x.drawImage(w.bg, 0, 0, w.pw, w.ph);
      for (const e of w.entities.slice().sort((a, b) => a.base - b.base)) {
        if (e.o && e.o.hi) x.drawImage(e.o.hi, e.x, e.y, e.o.w, e.o.h);
        else x.drawImage(e.img, e.x, e.y);
      }
      return c.toDataURL('image/png');
    },
  };
})();
