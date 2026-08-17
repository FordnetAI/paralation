// ============================================================
// Paralation - sprites.js
// Every piece of art is generated at load time onto offscreen
// canvases. Characters are pixel-string grids (1 char = 1 px),
// tiles and furniture are layered rectangles. Swap any of these
// for real sprite sheets later without touching game logic.
// ============================================================
const SPR = (() => {
  const T = 16;

  function cnv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function R(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }
  function O(g, x, y, w, h, c) { // 1px outline box
    c = c || '#3a2a1e';
    R(g, x, y, w, 1, c); R(g, x, y + h - 1, w, 1, c);
    R(g, x, y, 1, h, c); R(g, x + w - 1, y, 1, h, c);
  }
  // deterministic per-tile noise so floors don't shimmer between loads
  function rnd(x, y, k) { const n = Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453; return n - Math.floor(n); }
  function mix(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const r = ((pa >> 16) & 255) + ((((pb >> 16) & 255) - ((pa >> 16) & 255)) * t);
    const gg = ((pa >> 8) & 255) + ((((pb >> 8) & 255) - ((pa >> 8) & 255)) * t);
    const bl = (pa & 255) + (((pb & 255) - (pa & 255)) * t);
    return 'rgb(' + (r | 0) + ',' + (gg | 0) + ',' + (bl | 0) + ')';
  }

  // ---------------- character: Matt ----------------
  const PAL = {
    o: '#2e222f', H: '#5f3f24', h: '#7d5430', S: '#f2c9a1', s: '#d9a877',
    W: '#f8f8f8', E: '#3a5fc4', P: '#7d9bd8', p: '#5f7ab0', L: '#46567f',
    F: '#c9b98a', G: '#7fae57', g: '#5d8a3e'
  };
  function fromRows(rows) {
    const w = 16, h = rows.length, c = cnv(w, h), g = c.getContext('2d');
    for (let y = 0; y < h; y++) {
      const r = rows[y] || '';
      for (let x = 0; x < w; x++) {
        const ch = r[x] || '.';
        if (ch === '.') continue;
        R(g, x, y, 1, 1, PAL[ch] || '#ff00ff');
      }
    }
    return c;
  }
  function flipX(src) {
    const c = cnv(src.width, src.height), g = c.getContext('2d');
    g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0);
    return c;
  }
  function stack(body, legs) {
    const c = cnv(16, body.height + legs.height), g = c.getContext('2d');
    g.drawImage(body, 0, 0); g.drawImage(legs, 0, body.height);
    return c;
  }

  const bodyDown = fromRows([
    '....oooooooo....',
    '...oHHHHHHHHo...',
    '..oHHHHHHHHHHo..',
    '..oHhHHHHHHHho..',
    '..oHHHHHHHHHHo..',
    '..oHHSSSSSSHHo..',
    '..oHSSSSSSSSHo..',
    '..oHSWESSWESHo..',
    '..oSSSSSSSSSSo..',
    '...oSSsSSsSSo...',
    '...oSSSSSSSSo...',
    '....oSSssSSo....',
    '...oPPPPPPPPo...',
    '..oPPPPPPPPPPo..',
    '..oSPPPPPPPPSo..',
    '..oSPPPPPPPPSo..',
    '...oPpPPPPpPo...',
  ]);
  const bodyUp = fromRows([
    '....oooooooo....',
    '...oHHHHHHHHo...',
    '..oHHHHHHHHHHo..',
    '..oHhHHHHHHHho..',
    '..oHHHHHHHHHHo..',
    '..oHHHHHHHHHHo..',
    '..oHHhHHHHhHHo..',
    '..oHHHHHHHHHHo..',
    '..oHHHHHHHHHHo..',
    '...oHHHHHHHHo...',
    '...oSSHHHHSSo...',
    '....oSSSSSSo....',
    '...oPPPPPPPPo...',
    '..oPPPPPPPPPPo..',
    '..oSPPPPPPPPSo..',
    '..oSPPPPPPPPSo..',
    '...oPpPPPPpPo...',
  ]);
  const bodySide = fromRows([
    '....oooooooo....',
    '...oHHHHHHHHo...',
    '..oHHHHHHHHHHo..',
    '..oHHhHHHHHHHo..',
    '..oHHHHHHHHHHo..',
    '..oHHHHSSSSSHo..',
    '..oHHHSSSSSSSo..',
    '..oHHHSSWESSSo..',
    '..oHHHSSSSSSSo..',
    '...oHHSSSsSSo...',
    '...oHHSSSSSo....',
    '....oSSSSSo.....',
    '...oPPPPPPPPo...',
    '..oPPPPPPPPPo...',
    '..oPPPPSSPPPo...',
    '..oPPPPSSPPPo...',
    '...oPpPPPPpo....',
  ]);
  const legsFrontStand = fromRows([
    '....oLLLLLLo....',
    '....oLLooLLo....',
    '....oLLooLLo....',
    '...oFFFooFFFo...',
    '...oooo..oooo...',
  ]);
  const legsFrontA = fromRows([
    '....oLLLLLLo....',
    '....oLLooLLo....',
    '....oLLo.oLo....',
    '...oFFFo..oFo...',
    '...oooo...o.....',
  ]);
  const legsFrontB = flipX(legsFrontA);
  const legsSideStand = fromRows([
    '.....oLLLLo.....',
    '.....oLLLLo.....',
    '.....oLLLLo.....',
    '.....oFFFFFo....',
    '.....ooooo......',
  ]);
  const legsSideA = fromRows([
    '.....oLLLLo.....',
    '....oLLooLLo....',
    '...oLLo..oLLo...',
    '..oFFo....oFFo..',
    '..ooo......ooo..',
  ]);
  const legsSideB = fromRows([
    '.....oLLLLo.....',
    '.....oLLLLo.....',
    '....oLLLLo......',
    '....oFFFFo......',
    '....ooooo.......',
  ]);

  const matt = {
    down:  [stack(bodyDown, legsFrontStand), stack(bodyDown, legsFrontA), stack(bodyDown, legsFrontB)],
    up:    [stack(bodyUp, legsFrontStand), stack(bodyUp, legsFrontA), stack(bodyUp, legsFrontB)],
    right: [stack(bodySide, legsSideStand), stack(bodySide, legsSideA), stack(bodySide, legsSideB)],
  };
  matt.left = matt.right.map(flipX);

  // the parasite (future co-star; no longer the title mascot)
  const para = fromRows([
    '................',
    '......oooo......',
    '.....oGGGGo.....',
    '....oGgGGGGo....',
    '...oGGGGGGGGo...',
    '..oGWoGGGWoGGo..',
    '..oGGGGGGGGGGo..',
    '...oGGggGGGGo...',
    '....oGGGGGGo....',
    '...oGGGGGGo.....',
    '..oGGGGGGo......',
    '..oGGGGGo.......',
    '...oGGGGGo......',
    '....oGGGGGo.....',
    '.....ooooo......',
    '................',
  ]);

  // ---------------- floors ----------------
  // Art direction v2: ground is painted soft. vnoise is smooth value noise in
  // WORLD tile coordinates (bilinear over a coarse lattice), so tonal blotches
  // flow seamlessly across tile borders instead of reading as a 16px grid.
  // Tiles paint in 4px sub-blocks blended through it.
  function vnoise(tx, ty, k, scale) {
    const fx = tx / scale, fy = ty / scale;
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    const sx = fx - x0, sy = fy - y0;
    const u = sx * sx * (3 - 2 * sx), v = sy * sy * (3 - 2 * sy);
    const a = rnd(x0, y0, k), b2 = rnd(x0 + 1, y0, k);
    const c2 = rnd(x0, y0 + 1, k), d2 = rnd(x0 + 1, y0 + 1, k);
    return a + (b2 - a) * u + (c2 - a) * v + (a - b2 - c2 + d2) * u * v;
  }
  function softFill(g, px, py, tx, ty, dark, light, k, scale) {
    for (let by = 0; by < 4; by++) {
      for (let bx = 0; bx < 4; bx++) {
        const t = vnoise(tx + bx / 4, ty + by / 4, k, scale);
        R(g, px + bx * 4, py + by * 4, 4, 4, mix(dark, light, t));
      }
    }
  }

  // Art phase 2: ground and walls can be backed by AI textures. TEX maps a
  // grid char to its images/tex-*.png; TEXIMG is filled by the game's loader.
  // A loaded texture is sampled at WORLD coordinates (32px per tile in the
  // 256px texture, wrapping), so the pattern flows across tiles; a missing
  // texture falls back to the code paint below, per char, forever.
  const TEX = {
    w: 'tex-wood', b: 'tex-bath', k: 'tex-kitchen', G: 'tex-grass',
    R: 'tex-road', S: 'tex-paving', V: 'tex-paving', c: 'tex-paving',
    A: 'tex-wallBlue', B: 'tex-wallAqua', C: 'tex-wallRose', E: 'tex-wallCream',
    D: 'tex-wallWood', F: 'tex-wallGrey',
  };
  const TEXIMG = {};
  function texSlice(g, px, py, ch, tx, ty) {
    const ti = TEX[ch] && TEXIMG[TEX[ch]];
    if (!ti) return false;
    const sx = ((tx * 32) % ti.width + ti.width) % ti.width;
    const sy = ((ty * 32) % ti.height + ti.height) % ti.height;
    g.drawImage(ti, sx, sy, 32, 32, px, py, T, T);
    return true;
  }

  function floor(g, px, py, ch, tx, ty) {
    if (texSlice(g, px, py, ch, tx, ty)) return;
    if (ch === 'w') { // wood, soft warm planks
      softFill(g, px, py, tx, ty, '#a8815a', '#bd9268', 1, 5);
      for (let i = 0; i < 2; i++) R(g, px, py + i * 8 + 3, T, 1, 'rgba(96,66,38,0.18)');
      if ((tx + (ty >> 1)) % 3 === 0) R(g, px + 11, py + 3, 1, 8, 'rgba(96,66,38,0.15)');
    } else if (ch === 'b') { // bathroom, pale porcelain
      softFill(g, px, py, tx, ty, '#ccdde1', '#dbe9ec', 2, 4);
      if ((tx + ty) % 2) R(g, px, py, T, T, 'rgba(150,178,184,0.10)');
      R(g, px, py + 15, T, 1, 'rgba(128,158,164,0.22)');
      R(g, px + 15, py, 1, T, 'rgba(128,158,164,0.22)');
    } else if (ch === 'k') { // kitchen, warm cream stone
      softFill(g, px, py, tx, ty, '#cfc5ab', '#e0d7bf', 3, 4);
      R(g, px, py + 15, T, 1, 'rgba(154,140,108,0.22)');
      R(g, px + 15, py, 1, T, 'rgba(154,140,108,0.22)');
    } else if (ch === 'G') { // meadow grass, soft blotches, sparse blades
      softFill(g, px, py, tx, ty, '#5f9a4b', '#7fb35c', 4, 6);
      if (rnd(tx, ty, 8) > 0.6) {
        const bx = 2 + Math.floor(rnd(tx, ty, 9) * 11);
        const by = 2 + Math.floor(rnd(tx, ty, 10) * 11);
        R(g, px + bx, py + by, 1, 2, 'rgba(52,102,40,0.35)');
      }
      if (rnd(tx, ty, 11) > 0.996) { // the rare meadow flower, kept quiet
        const bx = 3 + Math.floor(rnd(tx, ty, 12) * 9);
        const by = 3 + Math.floor(rnd(tx, ty, 13) * 9);
        R(g, px + bx, py + by, 2, 2,
          rnd(tx, ty, 14) > 0.5 ? 'rgba(232,226,206,0.55)' : 'rgba(227,201,221,0.55)');
      }
    } else if (ch === 'R') { // road, soft warm asphalt
      softFill(g, px, py, tx, ty, '#55535c', '#63616b', 5, 7);
      if (rnd(tx, ty, 15) > 0.75) {
        R(g, px + Math.floor(rnd(tx, ty, 16) * 15), py + Math.floor(rnd(tx, ty, 17) * 15),
          1, 1, 'rgba(200,200,210,0.08)');
      }
    } else if (ch === 'S' || ch === 'V' || ch === 'c') { // stone paving
      const warm = ch === 'V';
      softFill(g, px, py, tx, ty, warm ? '#b6b1a2' : '#aeaa9c', warm ? '#cbc6b6' : '#c2beb0', 6, 5);
      if (tx % 2 === 0) R(g, px, py, 1, T, 'rgba(120,115,102,0.28)');
      if (ty % 2 === 0) R(g, px, py, T, 1, 'rgba(120,115,102,0.28)');
    } else if (ch === 'X') { // treeline canopy, soft dark foliage
      softFill(g, px, py, tx, ty, '#2c4d24', '#40693a', 7, 4);
      for (let i = 0; i < 2; i++) {
        const bx = Math.floor(rnd(tx, ty, 24 + i) * 10);
        const by = Math.floor(rnd(tx, ty, 27 + i) * 10);
        g.fillStyle = i ? 'rgba(70,116,60,0.5)' : 'rgba(28,50,22,0.45)';
        g.beginPath(); g.ellipse(px + 3 + bx, py + 3 + by, 4, 3, 0, 0, Math.PI * 2); g.fill();
      }
    } else {
      R(g, px, py, T, T, '#b48a5c');
    }
  }

  // ---------------- walls ----------------
  const WALLPAPER = {
    A: { base: '#8ea6c8', stripe: '#7e94b4' },  // Matt's room: blue
    B: { base: '#a5cdc8', stripe: '#93bcb7' },  // bathroom: aqua
    C: { base: '#c9a8a0', stripe: '#b89690' },  // parents: warm rose
    D: { wood: true, base: '#7a5a3a', dark: '#644828' }, // dividers
    E: { base: '#d9caa9', stripe: '#cbbb96' },  // downstairs: cream
    F: { base: '#9a968c', stripe: '#8d897f' },  // neighbour's garage: bare gray
  };
  function wall(g, px, py, type, belowFloor, aboveVoid) {
    const wp = WALLPAPER[type];
    if (texSlice(g, px, py, type, Math.floor(px / T), Math.floor(py / T))) {
      // texture carries the surface; the structural overlays still apply
      if (belowFloor) {
        R(g, px, py + 12, T, 1, 'rgba(150,116,80,0.8)');
        R(g, px, py + 13, T, 3, '#6b4b30');
      }
      if (aboveVoid) R(g, px, py, T, 2, 'rgba(20,14,10,0.85)');
      return;
    }
    if (wp.wood) {
      softFill(g, px, py, Math.floor(px / T), Math.floor(py / T), wp.dark, wp.base, 31, 4);
      R(g, px, py, 1, T, 'rgba(60,44,20,0.5)'); R(g, px + 15, py, 1, T, 'rgba(60,44,20,0.5)');
    } else {
      // soft vertical falloff instead of hard stripes: light near the top,
      // gently darker toward the floor, with a whisper of the old stripe
      softFill(g, px, py, Math.floor(px / T), Math.floor(py / T), wp.stripe, wp.base, 32, 5);
      const grad = g.createLinearGradient(0, py, 0, py + T);
      grad.addColorStop(0, 'rgba(255,255,255,0.10)');
      grad.addColorStop(1, 'rgba(30,24,40,0.08)');
      g.fillStyle = grad; g.fillRect(px, py, T, T);
      for (let x = 2; x < 16; x += 5) R(g, px + x, py, 2, T, 'rgba(255,255,255,0.05)');
    }
    if (belowFloor) {
      R(g, px, py + 12, T, 1, 'rgba(150,116,80,0.8)');
      R(g, px, py + 13, T, 3, '#6b4b30');
    }
    if (aboveVoid) R(g, px, py, T, 2, 'rgba(20,14,10,0.85)');
  }

  // ---------------- furniture ----------------
  const OBJ = {};
  function def(name, fw, fh, w, h, paint, opts) {
    const c = cnv(w, h); paint(c.getContext('2d'), w, h);
    OBJ[name] = Object.assign({ img: c, fw: fw, fh: fh, w: w, h: h, flat: false, solid: true }, opts || {});
  }

  def('bed', 2, 3, 32, 52, (g) => {
    R(g, 0, 0, 32, 12, '#6a4a2e'); R(g, 0, 0, 32, 2, '#82603c');
    R(g, 2, 10, 28, 40, '#ece4d4');
    R(g, 6, 12, 20, 8, '#f8f4ec'); R(g, 6, 19, 20, 2, '#d5cdbd');
    R(g, 2, 24, 28, 26, '#5d8a6a');
    R(g, 2, 24, 28, 3, '#729e80'); R(g, 2, 47, 28, 3, '#4b7257');
    R(g, 2, 33, 28, 1, 'rgba(0,0,0,0.15)');
    O(g, 0, 0, 32, 52);
  });

  def('nightstand', 1, 1, 16, 22, (g) => {
    R(g, 1, 6, 14, 14, '#8a6844');
    R(g, 0, 4, 16, 4, '#a07c50');
    R(g, 3, 12, 10, 1, '#5c4226'); R(g, 7, 14, 2, 2, '#3a2a1e');
    R(g, 2, 20, 3, 2, '#5c4226'); R(g, 11, 20, 3, 2, '#5c4226');
    R(g, 3, 0, 4, 5, '#e08030'); R(g, 3, 0, 4, 2, '#f0f0f0'); // pill bottle
    O(g, 0, 4, 16, 17);
  });

  def('bookshelf', 2, 1, 32, 40, (g) => {
    R(g, 0, 0, 32, 40, '#7a5a38');
    const cols = ['#c0504a', '#4a78c0', '#58a060', '#c8a040', '#8a5ac0', '#d07840'];
    for (let r = 0; r < 3; r++) {
      R(g, 2, 2 + r * 12, 28, 10, '#42301c');
      let x = 3;
      for (let i = 0; i < 7 && x < 27; i++) {
        const bw = 3 + ((r * 7 + i * 3) % 3);
        const bh = 7 + ((r + i) % 3);
        R(g, x, 12 + r * 12 - bh, bw, bh, cols[(r * 5 + i * 2) % cols.length]);
        x += bw + 1;
      }
    }
    O(g, 0, 0, 32, 40);
  });

  def('desk', 3, 1, 48, 30, (g) => {
    R(g, 2, 19, 4, 11, '#6a4a2e'); R(g, 42, 19, 4, 11, '#6a4a2e');
    R(g, 12, 0, 20, 12, '#2a2a34'); // monitor
    R(g, 14, 2, 16, 8, '#78c8e8'); R(g, 15, 3, 7, 1, '#c8ecf8'); R(g, 15, 5, 10, 1, '#a8dcf0');
    R(g, 20, 12, 4, 3, '#2a2a34');
    R(g, 0, 14, 48, 6, '#a07c50'); R(g, 0, 18, 48, 2, '#82603c');
    R(g, 14, 15, 14, 3, '#44404c'); // keyboard
    R(g, 5, 10, 4, 4, '#c0504a'); // mug
    R(g, 37, 15, 3, 2, '#2a2a34'); R(g, 41, 15, 3, 2, '#2a2a34'); R(g, 40, 15, 1, 1, '#2a2a34'); // glasses
  });

  def('chair', 1, 1, 14, 18, (g) => {
    R(g, 1, 0, 12, 9, '#8a6844');
    R(g, 3, 2, 2, 5, '#6a4a2e'); R(g, 6, 2, 2, 5, '#6a4a2e'); R(g, 9, 2, 2, 5, '#6a4a2e');
    R(g, 0, 9, 14, 5, '#a07c50');
    R(g, 1, 14, 2, 4, '#5c4226'); R(g, 11, 14, 2, 4, '#5c4226');
  });

  def('backpack', 1, 1, 14, 15, (g) => {
    R(g, 2, 3, 10, 11, '#c05a40');
    R(g, 2, 3, 10, 5, '#a34632'); // top flap
    R(g, 3, 7, 8, 1, '#7c3222');
    R(g, 4, 9, 6, 4, '#a34632'); // front pocket
    R(g, 6, 1, 2, 3, '#7c3222'); // handle
    R(g, 1, 5, 1, 7, '#5c2a20'); R(g, 12, 5, 1, 7, '#5c2a20'); // straps
    O(g, 1, 2, 12, 13, '#4a221a');
  });

  def('rug', 4, 3, 64, 48, (g) => {
    R(g, 2, 2, 60, 44, '#c07a5c');
    R(g, 6, 6, 52, 36, '#d0967a');
    R(g, 12, 12, 40, 24, '#c07a5c');
    R(g, 30, 22, 4, 4, '#d0967a');
  }, { flat: true, solid: false });

  def('rug2', 5, 5, 80, 80, (g) => {
    R(g, 2, 2, 76, 76, '#8f3c30'); // burgundy border
    R(g, 7, 7, 66, 66, '#b8503e');
    R(g, 12, 12, 56, 56, '#e2cba0'); // cream field
    R(g, 20, 20, 40, 40, '#d8b988');
    R(g, 36, 36, 8, 8, '#b8503e');
  }, { flat: true, solid: false });

  def('toilet', 1, 1, 16, 22, (g) => {
    R(g, 2, 0, 12, 7, '#e4eaec'); R(g, 1, 0, 14, 2, '#f4f8fa');
    R(g, 4, 2, 8, 2, '#c8d4d8'); // flush button
    R(g, 2, 7, 12, 11, '#f4f8fa');
    R(g, 4, 9, 8, 7, '#c8d4d8'); // seat ring
    R(g, 6, 11, 4, 3, '#a8bcc4'); // water
    R(g, 4, 18, 8, 3, '#d8e0e4');
    O(g, 1, 0, 14, 21, '#8a949c');
  });

  def('sinkP', 1, 1, 16, 24, (g) => {
    R(g, 1, 4, 14, 8, '#f4f8fa');
    R(g, 3, 6, 10, 4, '#c8d4d8');
    R(g, 7, 1, 2, 4, '#9aa2ac');
    R(g, 5, 12, 6, 12, '#e0e8ec');
    O(g, 1, 4, 14, 8, '#8a949c');
  });

  def('tub', 2, 2, 32, 30, (g) => {
    R(g, 0, 6, 32, 24, '#eef2f4');
    R(g, 0, 6, 32, 4, '#f8fbfc'); // rim
    R(g, 3, 10, 26, 17, '#a8d2e4'); // water
    O(g, 3, 10, 26, 17, '#8fb8cc'); // inner rim shadow
    R(g, 6, 13, 8, 2, '#d4ecf6'); R(g, 18, 17, 6, 2, '#c4e4f2'); // shine
    R(g, 24, 2, 7, 2, '#9aa2ac'); R(g, 26, 2, 3, 7, '#9aa2ac'); // faucet
    R(g, 2, 28, 5, 2, '#b0b8c0'); R(g, 25, 28, 5, 2, '#b0b8c0'); // feet
    O(g, 0, 6, 32, 22, '#8a949c');
  });

  def('bedDouble', 3, 3, 48, 52, (g) => {
    R(g, 0, 0, 48, 12, '#6a4a2e'); R(g, 0, 0, 48, 2, '#82603c');
    R(g, 2, 10, 44, 40, '#ece4d4');
    R(g, 5, 12, 16, 8, '#f8f4ec'); R(g, 27, 12, 16, 8, '#f8f4ec');
    R(g, 2, 24, 44, 26, '#a05860');
    R(g, 2, 24, 44, 3, '#b06c74'); R(g, 2, 47, 44, 3, '#8a4850');
    R(g, 2, 33, 44, 1, 'rgba(0,0,0,0.15)');
    O(g, 0, 0, 48, 52);
  });

  def('dresser', 2, 1, 32, 26, (g) => {
    R(g, 1, 4, 30, 20, '#8a6844');
    R(g, 0, 2, 32, 4, '#a07c50');
    R(g, 4, 9, 24, 5, '#7a5a38'); R(g, 4, 16, 24, 5, '#7a5a38');
    R(g, 15, 11, 2, 2, '#3a2a1e'); R(g, 15, 18, 2, 2, '#3a2a1e');
    R(g, 2, 24, 3, 2, '#5c4226'); R(g, 27, 24, 3, 2, '#5c4226');
    O(g, 0, 2, 32, 23);
  });

  def('plant', 1, 1, 16, 24, (g) => {
    R(g, 7, 12, 2, 5, '#3a5a28');
    R(g, 3, 3, 10, 10, '#4e8a3c');
    R(g, 1, 6, 5, 6, '#5d9c48');
    R(g, 10, 5, 5, 7, '#3f7530');
    R(g, 6, 0, 5, 6, '#5d9c48');
    R(g, 4, 16, 8, 6, '#b06438'); R(g, 3, 15, 10, 2, '#c07848');
  });

  def('hallTable', 2, 1, 32, 26, (g) => {
    R(g, 1, 7, 30, 6, '#c29a66'); R(g, 1, 12, 30, 2, '#8f6c42'); // bright top
    R(g, 3, 14, 3, 10, '#6a4a2e'); R(g, 26, 14, 3, 10, '#6a4a2e');
    R(g, 12, 0, 3, 2, '#e0607a'); R(g, 17, 0, 3, 2, '#e0a050'); // flowers
    R(g, 13, 2, 6, 5, '#4a78c0'); R(g, 14, 3, 2, 3, '#6a94d4'); // vase
    R(g, 22, 4, 6, 3, '#e8d890'); R(g, 23, 5, 4, 1, '#b8a860'); // mail
    O(g, 1, 7, 30, 7, '#5c4226');
  });

  def('railing', 1, 3, 16, 48, (g) => {
    // stair side panel: a low wood half-wall
    R(g, 5, 2, 7, 46, '#8a6a44');
    R(g, 5, 2, 7, 2, '#a8845a'); // top rail
    R(g, 5, 46, 7, 2, '#5c4226');
    R(g, 5, 2, 1, 46, '#5c4226'); R(g, 11, 2, 1, 46, '#5c4226');
    for (let y = 10; y < 44; y += 10) R(g, 6, y, 5, 1, 'rgba(0,0,0,0.15)');
  });

  def('stairsD', 2, 4, 32, 64, (g) => {
    R(g, 0, 0, 32, 64, '#3a2a1a');
    for (let i = 0; i < 8; i++) {
      R(g, 3, i * 8, 26, 8, mix('#c89a68', '#4a3524', i / 7));
      R(g, 3, i * 8, 26, 1, 'rgba(255,255,255,0.22)'); // step lip
      R(g, 3, i * 8 + 7, 26, 1, 'rgba(0,0,0,0.25)');
    }
    R(g, 0, 0, 3, 64, '#6a4c2e'); R(g, 29, 0, 3, 64, '#6a4c2e'); // side panels
    R(g, 0, 0, 3, 2, '#82603c'); R(g, 29, 0, 3, 2, '#82603c');
  }, { flat: true, solid: false });

  def('stairsU', 2, 4, 32, 64, (g) => {
    R(g, 0, 0, 32, 64, '#3a2a1a');
    R(g, 3, 0, 26, 6, '#241a12'); // dark landing to the upper floor
    for (let i = 0; i < 7; i++) {
      R(g, 3, 6 + i * 8, 26, 8, mix('#e8c294', '#b48a5c', i / 6));
      R(g, 3, 6 + i * 8, 26, 1, 'rgba(255,255,255,0.25)');
      R(g, 3, 6 + i * 8 + 7, 26, 1, 'rgba(0,0,0,0.2)');
    }
    R(g, 0, 0, 3, 64, '#6a4c2e'); R(g, 29, 0, 3, 64, '#6a4c2e');
    R(g, 0, 0, 3, 2, '#82603c'); R(g, 29, 0, 3, 2, '#82603c');
  }, { flat: true, solid: false });

  def('couch', 3, 2, 48, 30, (g) => {
    R(g, 2, 0, 44, 10, '#a8663c'); R(g, 2, 0, 44, 2, '#c07c4c'); // back
    R(g, 0, 2, 7, 26, '#96562f'); R(g, 41, 2, 7, 26, '#96562f'); // arms
    R(g, 1, 2, 5, 2, '#b06c3f'); R(g, 42, 2, 5, 2, '#b06c3f');
    R(g, 7, 10, 17, 11, '#c08050'); R(g, 24, 10, 17, 11, '#b87848'); // cushions
    R(g, 23, 10, 1, 11, 'rgba(0,0,0,0.25)'); // seat seam
    R(g, 16, 1, 1, 9, 'rgba(0,0,0,0.15)'); R(g, 31, 1, 1, 9, 'rgba(0,0,0,0.15)'); // back seams
    R(g, 7, 20, 34, 1, 'rgba(0,0,0,0.2)');
    R(g, 7, 21, 34, 7, '#96562f'); // front skirt
    R(g, 3, 28, 3, 2, '#42301c'); R(g, 42, 28, 3, 2, '#42301c'); // feet
    O(g, 0, 0, 48, 30, '#5a3016');
  });

  def('tvStand', 3, 1, 48, 34, (g) => {
    R(g, 8, 0, 32, 18, '#181820');
    R(g, 10, 2, 28, 14, '#283048');
    R(g, 12, 4, 8, 2, '#4a5a7c');
    R(g, 20, 18, 8, 2, '#101014');
    R(g, 0, 18, 48, 3, '#82603c');
    R(g, 2, 21, 44, 11, '#6a4a2e');
    R(g, 12, 24, 1, 5, '#42301c'); R(g, 35, 24, 1, 5, '#42301c');
    O(g, 0, 18, 48, 15);
  });

  def('coffeeT', 2, 1, 32, 20, (g) => {
    R(g, 0, 4, 32, 6, '#a07c50'); R(g, 0, 9, 32, 1, '#82603c');
    R(g, 2, 10, 3, 8, '#6a4a2e'); R(g, 27, 10, 3, 8, '#6a4a2e');
    R(g, 8, 0, 10, 4, '#4a78c0'); // the ocean puzzle box
    R(g, 21, 5, 2, 2, '#58a060'); R(g, 24, 6, 2, 2, '#c0504a');
  });

  function paintCounter(g) {
    R(g, 1, 8, 14, 18, '#8a6844');
    R(g, 0, 4, 16, 6, '#e6e0d0'); R(g, 0, 8, 16, 2, '#c8c0ac');
    R(g, 3, 14, 10, 1, '#5c4226'); R(g, 7, 17, 2, 2, '#3a2a1e');
    R(g, 2, 26, 12, 2, '#42301c');
  }
  def('counter', 1, 1, 16, 28, paintCounter);
  def('counterSink', 1, 1, 16, 28, (g) => {
    paintCounter(g);
    R(g, 3, 4, 10, 5, '#c8d4d8'); R(g, 4, 5, 8, 3, '#aab8bd');
    R(g, 6, 0, 2, 5, '#9aa2ac'); R(g, 6, 0, 5, 2, '#9aa2ac');
  });
  def('counterNote', 1, 1, 16, 28, (g) => {
    paintCounter(g);
    R(g, 4, 2, 8, 6, '#f6f2e2');
    R(g, 5, 4, 6, 1, '#b0a890'); R(g, 5, 6, 4, 1, '#b0a890');
  });

  def('stove', 1, 1, 16, 28, (g) => {
    R(g, 1, 8, 14, 18, '#e8e8ec');
    R(g, 0, 4, 16, 6, '#d8d8dc');
    R(g, 2, 5, 4, 3, '#202024'); R(g, 9, 5, 4, 3, '#202024');
    R(g, 2, 10, 12, 2, '#b8b8c0');
    R(g, 4, 15, 8, 6, '#303038'); R(g, 5, 16, 6, 2, '#484858');
    R(g, 2, 26, 12, 2, '#9a9aa2');
  });

  def('fridge', 1, 1, 16, 34, (g) => {
    R(g, 1, 2, 14, 30, '#dce4e8');
    R(g, 1, 12, 14, 2, '#b8c4cc');
    R(g, 12, 5, 2, 5, '#8a949c'); R(g, 12, 16, 2, 7, '#8a949c');
    R(g, 4, 18, 2, 2, '#c0504a'); R(g, 7, 22, 2, 2, '#4a78c0'); // magnets
    O(g, 0, 2, 16, 31, '#5a646c');
  });

  def('tableD', 3, 2, 48, 34, (g) => {
    R(g, 2, 6, 44, 10, '#a07c50'); R(g, 2, 15, 44, 1, '#82603c');
    R(g, 2, 16, 44, 3, '#82603c');
    R(g, 4, 19, 4, 14, '#6a4a2e'); R(g, 40, 19, 4, 14, '#6a4a2e');
    R(g, 19, 8, 10, 4, '#5c4226'); // fruit bowl
    R(g, 21, 7, 2, 2, '#c0504a'); R(g, 25, 7, 2, 2, '#58a060');
  });

  def('mat', 2, 1, 32, 12, (g) => {
    R(g, 1, 1, 30, 10, '#a06a4a');
    R(g, 1, 1, 30, 2, '#8a5638'); R(g, 1, 9, 30, 2, '#8a5638');
    R(g, 8, 5, 16, 2, '#b8825e');
  }, { flat: true, solid: false });

  // --- wall-mounted art (drawn into the background) ---
  def('doorF', 2, 1, 32, 26, (g) => {
    R(g, 0, 0, 32, 26, '#5c4226');
    R(g, 3, 2, 26, 24, '#8a6040');
    R(g, 6, 5, 8, 8, '#7a5234'); R(g, 18, 5, 8, 8, '#7a5234');
    R(g, 6, 16, 8, 8, '#7a5234'); R(g, 18, 16, 8, 8, '#7a5234');
    R(g, 26, 13, 2, 2, '#e0c060');
  }, { solid: false, dy: -10 });

  def('mirrorW', 1, 1, 12, 22, (g) => {
    R(g, 0, 0, 12, 22, '#a87c34');
    R(g, 1, 1, 10, 20, '#c89c48');
    R(g, 2, 3, 8, 16, '#a6d8e4');
    R(g, 3, 4, 2, 7, '#d8f2f8'); R(g, 6, 9, 2, 7, '#c2e8f2');
  }, { solid: false, dy: -7 });

  def('poster', 1, 1, 14, 18, (g) => {
    R(g, 0, 0, 14, 18, '#20284a');
    R(g, 0, 0, 14, 1, '#3a4670'); R(g, 0, 17, 14, 1, '#3a4670');
    R(g, 4, 5, 6, 6, '#e0a050'); R(g, 2, 8, 10, 2, '#c8b880'); // ringed planet
    R(g, 2, 2, 1, 1, '#f8f8f8'); R(g, 11, 3, 1, 1, '#f8f8f8'); R(g, 9, 14, 1, 1, '#f8f8f8');
    R(g, 10, 12, 2, 4, '#d0d0d8'); // tiny rocket
  }, { solid: false, dy: -5 });

  def('windowW', 2, 1, 32, 24, (g) => {
    R(g, 0, 0, 32, 24, '#f0ece0');
    R(g, 2, 2, 28, 20, '#a8d4ec');
    R(g, 2, 2, 28, 8, '#bfe2f4');
    R(g, 6, 6, 8, 3, '#ffffff'); R(g, 18, 10, 7, 3, '#f0f8ff');
    R(g, 15, 2, 2, 20, '#f0ece0'); R(g, 2, 11, 28, 2, '#f0ece0');
    R(g, 0, 22, 32, 2, '#d8d0bc');
  }, { solid: false, dy: 4 });

  def('photoW', 1, 1, 12, 14, (g) => {
    R(g, 0, 0, 12, 14, '#8a6040');
    R(g, 2, 2, 8, 10, '#a8d4ec');
    R(g, 2, 8, 8, 4, '#e8d8a0');
    R(g, 3, 5, 2, 5, '#c0504a'); R(g, 7, 5, 2, 5, '#4a78c0'); R(g, 5, 7, 2, 3, '#58a060');
  }, { solid: false, dy: -3 });

  // ---------------- exteriors ----------------
  // A house is one 16x12-tile object (256x192px). The whole footprint is solid;
  // the front door sits on the bottom edge so a portal placed on the tile row
  // directly below it lines up with the doorway.
  const HOUSE_W = 256, HOUSE_H = 192, ROOF_H = 96;

  function paintHouse(g, pal, opt) {
    opt = opt || {};
    const W = HOUSE_W, H = HOUSE_H, wx = 6, ww = W - 12;
    // hip roof: each scanline insets toward the ridge, which reads as a slope
    for (let i = 0; i < ROOF_H; i++) {
      const t = i / ROOF_H;
      const inset = Math.round((1 - t) * 24);
      R(g, inset, i, W - inset * 2, 1, mix(pal.roofDk, pal.roof, t));
    }
    for (let y = 12; y < ROOF_H - 4; y += 9) { // shingle courses
      const inset = Math.round((1 - y / ROOF_H) * 24);
      R(g, inset, y, W - inset * 2, 1, 'rgba(0,0,0,0.16)');
    }
    R(g, 0, ROOF_H, W, 5, pal.eave); // eave overhang casts the wall into shade
    R(g, 0, ROOF_H + 5, W, 2, 'rgba(0,0,0,0.22)');

    const wy = ROOF_H + 7, wh = H - wy;
    R(g, wx, wy, ww, wh, pal.wall);
    for (let y = wy + 6; y < H; y += 7) R(g, wx, y, ww, 1, pal.wallDk); // siding
    R(g, wx, wy, 4, wh, pal.trim); R(g, wx + ww - 4, wy, 4, wh, pal.trim);

    const win = (x, y, w, h) => {
      R(g, x - 3, y - 3, w + 6, h + 6, pal.trim);
      R(g, x, y, w, h, '#3b5468');
      R(g, x, y, w, Math.round(h * 0.45), '#5c8098');
      R(g, x + (w >> 1) - 1, y, 2, h, pal.trim);
      R(g, x, y + (h >> 1) - 1, w, 2, pal.trim);
    };

    // front door, centred on tiles 7-8 of the footprint
    const dx = 112, dw = 32, dy = H - 48;
    R(g, dx - 4, dy - 4, dw + 8, 52, pal.trim);
    if (opt.open) { // garage standing open: a dark mouth, not a panel
      R(g, dx - 4, dy - 4, dw + 8, 52, '#2a2620');
      R(g, dx - 2, dy - 2, dw + 4, 6, '#4a443a');
    } else {
      R(g, dx, dy, dw, 48, pal.door);
      R(g, dx + 4, dy + 5, dw - 8, 17, pal.doorDk);
      R(g, dx + 4, dy + 27, dw - 8, 15, pal.doorDk);
      R(g, dx + dw - 8, dy + 25, 3, 3, '#e8c860');
    }
    R(g, dx - 8, H - 4, dw + 16, 4, '#cfcabc'); // stoop

    if (opt.garage) { // roll-up door on the left bay
      const gx = 24, gw = 72, gy = H - 58;
      R(g, gx - 4, gy - 4, gw + 8, 62, pal.trim);
      if (opt.openGarage) {
        R(g, gx, gy, gw, 58, '#2a2620');
        R(g, gx, gy, gw, 7, '#4a443a');
        R(g, gx, gy + 50, gw, 8, '#191612');
      } else {
        R(g, gx, gy, gw, 58, pal.garage || pal.trim);
        for (let y = gy + 6; y < gy + 58; y += 11) R(g, gx, y, gw, 2, 'rgba(0,0,0,0.18)');
      }
      win(184, ROOF_H + 22, 40, 30);
    } else {
      win(34, ROOF_H + 22, 40, 30);
      win(184, ROOF_H + 22, 40, 30);
    }
  }

  function defHouse(name, pal, opt) {
    def(name, 16, 12, HOUSE_W, HOUSE_H, (g) => paintHouse(g, pal, opt));
  }

  defHouse('houseMatt', { // cream stucco + terracotta tile, the San Diego default
    roof: '#c06a45', roofDk: '#8e4529', eave: '#7a3d24',
    wall: '#e8dabb', wallDk: '#d4c4a2', trim: '#f4ecd8',
    door: '#4f6f92', doorDk: '#3d5876',
  });
  defHouse('houseA', {
    roof: '#7b6a58', roofDk: '#54473a', eave: '#463b30',
    wall: '#a9c0a1', wallDk: '#93ab8b', trim: '#e6ecdf',
    door: '#7a4a2c', doorDk: '#5d3720', garage: '#dfe4d8',
  }, { garage: true });
  defHouse('houseB', {
    roof: '#55525c', roofDk: '#3a3841', eave: '#2f2d35',
    wall: '#9fb6c6', wallDk: '#8aa0af', trim: '#eef2f5',
    door: '#8a3f38', doorDk: '#6a2d28',
  });
  defHouse('houseC', {
    roof: '#b05a3c', roofDk: '#7f3c26', eave: '#6b3220',
    wall: '#ddb894', wallDk: '#c8a37f', trim: '#f6e6d0',
    door: '#3f6d5a', doorDk: '#2e5343', garage: '#f0e2cc',
  }, { garage: true });
  defHouse('houseD', {
    roof: '#5d6672', roofDk: '#3f4650', eave: '#343a43',
    wall: '#e6e2d6', wallDk: '#d0ccbf', trim: '#f8f6ee',
    door: '#5a4a72', doorDk: '#443659',
  });
  // the one you can walk into: same shell, garage bay standing open
  defHouse('houseOpen', {
    roof: '#7b6a58', roofDk: '#54473a', eave: '#463b30',
    wall: '#c9b98f', wallDk: '#b3a37a', trim: '#ece2c8',
    door: '#7a4a2c', doorDk: '#5d3720',
  }, { garage: true, openGarage: true });

  def('tree', 2, 2, 48, 76, (g) => {
    // trunk starts inside the canopy: at 56 it read as a floating stick
    R(g, 20, 46, 8, 30, '#6b4a2c'); R(g, 20, 46, 3, 30, '#805a36');
    const blob = (x, y, w, h, c) => { R(g, x, y, w, h, c); };
    blob(6, 12, 36, 40, '#3f7a30');
    blob(2, 22, 44, 22, '#3f7a30');
    blob(10, 4, 28, 18, '#4a8c38');
    blob(8, 14, 20, 16, '#57a042');
    blob(24, 30, 16, 14, '#2f5f24');
    blob(4, 34, 12, 10, '#2f5f24');
    R(g, 14, 8, 6, 4, '#63b04c'); R(g, 30, 18, 5, 4, '#63b04c');
  }, { solid: true });

  def('bush', 1, 1, 22, 20, (g) => {
    R(g, 2, 6, 18, 14, '#3f7a30');
    R(g, 0, 10, 22, 8, '#3f7a30');
    R(g, 5, 2, 12, 8, '#4a8c38');
    R(g, 6, 5, 6, 5, '#57a042');
    R(g, 13, 12, 6, 5, '#2f5f24');
  });

  def('hedge', 1, 1, 16, 18, (g) => {
    R(g, 0, 2, 16, 16, '#356b28');
    R(g, 0, 2, 16, 4, '#478a35');
    R(g, 3, 7, 3, 3, '#54a13f'); R(g, 10, 11, 3, 3, '#2b5720');
  });

  def('mailbox', 1, 1, 14, 26, (g) => {
    R(g, 6, 10, 3, 16, '#6b5136');
    R(g, 1, 4, 12, 9, '#5a636e'); R(g, 1, 4, 12, 3, '#79838f');
    R(g, 11, 6, 2, 5, '#b04a3a'); // flag
    R(g, 2, 9, 3, 2, '#3a4048');
  }, { solid: false });

  def('fence', 1, 1, 16, 20, (g) => {
    R(g, 0, 6, 16, 3, '#c8b48c'); R(g, 0, 13, 16, 3, '#c8b48c');
    R(g, 1, 2, 4, 18, '#dcc79c'); R(g, 9, 2, 4, 18, '#dcc79c');
    R(g, 1, 2, 4, 2, '#efdcb4'); R(g, 9, 2, 4, 2, '#efdcb4');
    R(g, 0, 18, 16, 2, 'rgba(0,0,0,0.18)');
  });

  def('lamp', 1, 1, 14, 58, (g) => {
    R(g, 5, 12, 4, 46, '#4a4e55'); R(g, 5, 12, 2, 46, '#5e636c');
    R(g, 2, 52, 10, 6, '#3c4046');
    R(g, 1, 4, 12, 9, '#f0e2a8'); R(g, 2, 5, 10, 7, '#fdf6d2');
    R(g, 0, 1, 14, 4, '#4a4e55');
  }, { solid: false });

  def('car', 2, 3, 32, 50, (g, W, H) => {
    R(g, 3, 2, 26, 46, '#a83f38'); // body
    R(g, 3, 2, 26, 4, '#c25049');
    R(g, 5, 8, 22, 12, '#31404e'); // windshield
    R(g, 5, 30, 22, 11, '#31404e'); // rear glass
    R(g, 5, 8, 22, 4, '#4d6478');
    R(g, 1, 12, 2, 10, '#2c2a2e'); R(g, 29, 12, 2, 10, '#2c2a2e');
    R(g, 1, 32, 2, 10, '#2c2a2e'); R(g, 29, 32, 2, 10, '#2c2a2e');
    R(g, 7, 1, 5, 3, '#f4eec8'); R(g, 20, 1, 5, 3, '#f4eec8');
    R(g, 7, 46, 5, 3, '#c04030'); R(g, 20, 46, 5, 3, '#c04030');
    R(g, 3, 22, 26, 2, 'rgba(0,0,0,0.2)');
  });

  def('trash', 1, 1, 16, 24, (g) => {
    R(g, 2, 5, 12, 19, '#3f6b48'); R(g, 2, 5, 12, 3, '#4f8159');
    R(g, 1, 2, 14, 5, '#2f5136'); R(g, 1, 2, 14, 2, '#436a49');
    R(g, 6, 3, 4, 2, '#26422c');
  });

  def('hoop', 1, 1, 22, 62, (g) => {
    R(g, 9, 20, 4, 42, '#54585f');
    R(g, 5, 58, 12, 4, '#3c4046');
    R(g, 3, 2, 16, 14, '#e8e4d8'); R(g, 4, 3, 14, 12, '#f6f2e6');
    R(g, 8, 8, 6, 6, '#c04a38');
    R(g, 6, 16, 10, 3, '#d8562f'); // rim
    R(g, 7, 19, 8, 5, 'rgba(255,255,255,0.6)');
  }, { solid: false });

  // ---------------- garage interior props ----------------
  def('weightBench', 2, 1, 32, 26, (g) => {
    R(g, 2, 6, 28, 9, '#2f3238'); R(g, 2, 6, 28, 3, '#41454d');
    R(g, 4, 15, 4, 11, '#54585f'); R(g, 24, 15, 4, 11, '#54585f');
    R(g, 0, 2, 32, 5, '#3a3e45');
  });

  def('weights', 1, 1, 26, 16, (g) => {
    R(g, 2, 7, 22, 3, '#9aa0a8'); // bar
    R(g, 0, 2, 6, 13, '#33363c'); R(g, 20, 2, 6, 13, '#33363c');
    R(g, 0, 2, 6, 3, '#484c54'); R(g, 20, 2, 6, 3, '#484c54');
  });

  def('workbench', 3, 1, 48, 30, (g) => {
    R(g, 0, 4, 48, 8, '#8a6440'); R(g, 0, 4, 48, 3, '#a07a52');
    R(g, 2, 12, 5, 18, '#6b4c2e'); R(g, 41, 12, 5, 18, '#6b4c2e');
    R(g, 8, 0, 4, 5, '#b04a3a'); R(g, 16, 1, 3, 4, '#5a636e');
    R(g, 30, 0, 7, 5, '#e0c060');
  });

  def('boxes', 1, 1, 24, 26, (g) => {
    R(g, 0, 10, 16, 16, '#b08a58'); R(g, 0, 10, 16, 3, '#c49c68');
    R(g, 7, 10, 2, 16, '#95713f');
    R(g, 10, 0, 14, 12, '#c09868'); R(g, 10, 0, 14, 3, '#d2aa78');
    R(g, 16, 0, 2, 12, '#a37c48');
  });

  // Soft contact shadow, stretched under every object at draw time. Objects
  // without one read as pasted onto the floor rather than standing on it.
  // Pre-rendered once because building a radial gradient per object per frame
  // is far too slow, and a hard-edged ellipse reads as a sticker of its own.
  const shadow = (() => {
    const S = 64, c = cnv(S, S), x = c.getContext('2d');
    const gr = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    gr.addColorStop(0, 'rgba(0,0,0,0.62)');
    gr.addColorStop(0.45, 'rgba(0,0,0,0.34)');
    gr.addColorStop(0.75, 'rgba(0,0,0,0.10)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, S, S);
    return c;
  })();

  return { cnv: cnv, matt: matt, para: para, OBJ: OBJ, wall: wall, floor: floor,
           shadow: shadow, TEX: TEX, TEXIMG: TEXIMG };
})();
