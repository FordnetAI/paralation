// ============================================================
// Paralation - maps.js
// Floor layouts. Each ground row is 30 chars (30x17 tiles).
//   A/B/C/E = wallpaper walls   D = wood divider wall
//   w = wood floor   b = bathroom tile   k = kitchen tile
//   . = void (outside the house)
// objects: [type, tileX, tileY] where tileX/Y is the top-left of
// the FOOTPRINT (sprites taller than their footprint rise upward).
// inter: examine rectangles in tile coords with dialogue lines.
// portals: pixel rects that trigger the stair transition.
// ============================================================
const MAPS = {

  intro: [
    '...ugh. Morning already?',
    'Wait.',
    'I can see. The ceiling fan. The poster. EVERYTHING.',
    'I am not wearing my glasses. And I can see.',
    'And I feel... strong. Not "good day" strong. STRONG strong.',
    'Yesterday I could barely climb the stairs. What is happening to me?',
  ],

  upper: {
    ground: [
      'AAAAAAAAAAAAABBBBBBBCCCCCCCCCC',
      'AAAAAAAAAAAAABBBBBBBCCCCCCCCCC',
      'AwwwwwwwwwwwDbbbbbbDwwwwwwwwwC',
      'AwwwwwwwwwwwDbbbbbbDwwwwwwwwwC',
      'AwwwwwwwwwwwDbbbbbbDwwwwwwwwwC',
      'AwwwwwwwwwwwDbbbbbbDwwwwwwwwwC',
      'AwwwwwwwwwwwDbbbbbbDwwwwwwwwwC',
      'AwwwwwwwwwwwDbbbbbbDwwwwwwwwwC',
      'AwwwwwwwwwwwDbbbbbbDwwwwwwwwwC',
      'AwwwwwwwwwwwDbbbbbbDwwwwwwwwwC',
      'DDDDDDwDDDDDDDDbbDDDDDDDwDDDDD',
      'DwwwwwwwwwwwwwwwwwwwwwwwwwwwwD',
      'DwwwwwwwwwwwwwwwwwwwwwwwwwwwwD',
      'DwwwwwwwwwwwwwwwwwwwwwwwwwwwwD',
      'DwwwwwwwwwwwwwwwwwwwwwwwwwwwwD',
      'DDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
      '..............................',
    ],
    objects: [
      ['bed', 1, 2], ['nightstand', 3, 2], ['bookshelf', 6, 2], ['desk', 9, 2],
      ['chair', 10, 3], ['backpack', 5, 7], ['rug', 4, 4],
      ['toilet', 13, 2], ['sinkP', 15, 2], ['tub', 17, 2],
      ['bedDouble', 21, 2], ['dresser', 25, 2], ['plant', 28, 2],
      ['plant', 1, 11], ['hallTable', 12, 11], ['railing', 26, 12], ['stairsD', 27, 11],
    ],
    wallArt: [
      ['poster', 4, 1], ['mirrorW', 5, 1], ['windowW', 10, 0],
      ['mirrorW', 15, 1], ['photoW', 27, 1],
    ],
    inter: [
      { x: 1, y: 2, w: 2, h: 3, lines: [
        'I slept twelve hours straight. No night sweats. No aches.',
        'Best sleep since eighth grade.' ] },
      { x: 3, y: 2, w: 1, h: 1, lines: [
        'My chemo meds. Twice a day, every day, for two years.',
        'This morning is the first morning I forgot to think about them.',
        'I do not feel sick. At all.' ] },
      { x: 5, y: 1, w: 1, h: 1, lines: [
        'It is me. But... not sick me.',
        'No gray skin. No dark circles. I look like the "before" photo.',
        '...I should check on literally everything else in my life.' ] },
      { x: 4, y: 1, w: 1, h: 1, lines: [
        'Saturn V cutaway poster. Three stages, five F-1 engines.',
        'Still the coolest machine humans ever built.' ] },
      { x: 6, y: 2, w: 2, h: 1, lines: [
        'Comics, half-finished homework, and a telescope manual.',
        'I just lifted this shelf with ONE HAND to grab a comic. The full shelf.' ] },
      { x: 9, y: 2, w: 3, h: 2, lines: [
        'My glasses, right where I left them.',
        'Minus 7.5 in both eyes. "Legally a bat," the optometrist said.',
        'I can count the stitches on my backpack from across the room.' ] },
      { x: 5, y: 7, w: 1, h: 1, lines: [
        'My pack from the class trip to the Arizona forest.',
        'Something bit my neck out there. Mr. Alvarez said it was "probably a mosquito."',
        'It did not feel like a mosquito.' ] },
      { x: 13, y: 2, w: 1, h: 1, lines: [
        'It is a toilet. Even a superhuman does not examine the toilet.' ] },
      { x: 15, y: 1, w: 1, h: 2, lines: [
        'Bathroom mirror check: still healthy. Still confused.',
        'My skin has actual color in it. When did that happen?' ] },
      { x: 17, y: 2, w: 2, h: 2, lines: [
        'The tub where I spend bad-treatment-day evenings.',
        'Feels like a place from somebody else\'s life this morning.' ] },
      { x: 21, y: 2, w: 3, h: 3, lines: [
        'Mom and Dad\'s bed, made with hospital corners. Dad\'s rule.',
        'They let me sleep in. They ALWAYS wake me for meds.' ] },
      { x: 25, y: 2, w: 2, h: 1, lines: [
        'Dad\'s dresser. His lucky socks live in the top drawer.',
        'Some things you do not touch, superpowers or not.' ] },
      { x: 27, y: 1, w: 1, h: 1, lines: [
        'Mom and Dad\'s wedding photo.',
        'Dad had SO much hair. Mom has the same laugh.' ] },
      { x: 12, y: 11, w: 2, h: 1, lines: [
        'Mail, car keys, and a coupon for the waffle place.',
        'Focus, Matt.' ] },
    ],
    portals: [
      { x: 432, y: 224, w: 32, h: 16, to: 'lower', dx: 448, dy: 88, face: 'down' },
    ],
  },

  lower: {
    ground: [
      'EEEEEEEEEEEEEEEEEEEEEEEEEEEEEE',
      'EEEEEEEEEEEEEEEEEEEEEEEEEEEEEE',
      'EwwwwwwwwwwwwwwwDkkkkkkkkkwwwE',
      'EwwwwwwwwwwwwwwwDkkkkkkkkkwwwE',
      'EwwwwwwwwwwwwwwwDkkkkkkkkkwwwE',
      'EwwwwwwwwwwwwwwwDkkkkkkkkkwwwE',
      'EwwwwwwwwwwwwwwwDkkkkkkkkkwwwE',
      'EwwwwwwwwwwwwwwwwkkkkkkkkkwwwE',
      'EwwwwwwwwwwwwwwwwwwwwwwwwwwwwE',
      'EwwwwwwwwwwwwwwwwwwwwwwwwwwwwE',
      'EwwwwwwwwwwwwwwwwwwwwwwwwwwwwE',
      'EwwwwwwwwwwwwwwwwwwwwwwwwwwwwE',
      'EwwwwwwwwwwwwwwwwwwwwwwwwwwwwE',
      'EwwwwwwwwwwwwwwwwwwwwwwwwwwwwE',
      'EwwwwwwwwwwwwwwwwwwwwwwwwwwwwE',
      'EEEEEEEEEEEEEEwwEEEEEEEEEEEEEE',
      '..............................',
    ],
    objects: [
      ['tvStand', 2, 2], ['couch', 2, 5], ['coffeeT', 2, 8], ['rug2', 1, 4],
      ['bookshelf', 7, 2], ['plant', 14, 2], ['plant', 1, 13],
      ['counter', 17, 2], ['counterSink', 18, 2], ['counterNote', 19, 2],
      ['counter', 20, 2], ['stove', 21, 2], ['counter', 22, 2], ['fridge', 23, 2],
      ['tableD', 19, 9], ['chair', 18, 9], ['chair', 22, 9], ['chair', 20, 11],
      ['mat', 14, 13], ['railing', 26, 2], ['stairsU', 27, 2],
    ],
    wallArt: [
      ['windowW', 12, 0], ['photoW', 10, 1], ['windowW', 18, 0], ['doorF', 14, 15],
    ],
    inter: [
      { x: 2, y: 2, w: 3, h: 1, lines: [
        'Saturday morning cartoons.',
        'First Saturday in my life where the TV is not the most interesting thing in the house.' ] },
      { x: 2, y: 5, w: 3, h: 2, lines: [
        'The couch has a Matt-shaped dent from a hundred sick days.',
        'I do not feel like lying down. That is new.' ] },
      { x: 2, y: 8, w: 2, h: 1, lines: [
        'Mom\'s 2000-piece ocean puzzle. Forty pieces done. All corners.',
        'Respect.' ] },
      { x: 7, y: 2, w: 2, h: 1, lines: [
        'Dad\'s spy thrillers and Mom\'s gardening books.',
        'One of these has a twist ending. The other is about tomatoes.' ] },
      { x: 10, y: 1, w: 1, h: 1, lines: [
        'The three of us at Mission Beach, two summers ago.',
        'Before the diagnosis. Everybody is smiling and nobody is pretending.',
        'We are going to smile like that again. I can feel it.' ] },
      { x: 14, y: 2, w: 1, h: 1, lines: [
        'Mom\'s monstera. It is thriving.',
        'Today, honestly? Same.' ] },
      { x: 18, y: 2, w: 1, h: 1, lines: [
        'Dishes done and drying. Mom was up early.' ] },
      { x: 19, y: 2, w: 1, h: 1, lines: [
        'A note in Mom\'s handwriting:',
        '"Matt - Dad and I ran to the store. Waffles in the freezer. REST UP from the trip. Love, Mom."',
        'Rest up. Right. About that, Mom...' ] },
      { x: 21, y: 2, w: 1, h: 1, lines: [
        'House rule: Matt does not use the stove after The Grilled Cheese Incident.',
        'I could probably bench-press the stove now. The rule stands.' ] },
      { x: 23, y: 2, w: 1, h: 1, lines: [
        'Waffles in the freezer, as promised.',
        'I am five-waffles hungry. Maybe ten. Since when am I ever hungry?' ] },
      { x: 19, y: 9, w: 3, h: 2, lines: [
        'The dinner table. Taco Tuesdays are legally binding in this house.' ] },
      { x: 14, y: 15, w: 2, h: 1, lines: [
        'Two days ago: class trip, weird bug bite, nothing else.',
        'This morning: perfect eyes, superstrength, zero symptoms.',
        'I need to figure out what is inside me before I walk out that door.' ] },
    ],
    portals: [
      { x: 432, y: 32, w: 32, h: 16, to: 'upper', dx: 448, dy: 184, face: 'left' },
      // front door. gate:true routes through the five-story-beat check in game.js
      { x: 224, y: 240, w: 32, h: 16, to: 'outside', dx: 768, dy: 280, face: 'down', gate: true },
    ],
  },

  // ============================================================
  // The cul-de-sac. 96x120 tiles (1536x1920px), so unlike the interiors this
  // map is much larger than the 480x272 viewport and the camera scrolls.
  // It is generated rather than typed: a literal grid would be 11,520
  // characters and impossible to keep aligned by hand.
  // ============================================================
  outside: {
    build: function () {
      const W = 96, H = 120;          // map size in tiles
      const CX = 48, CY = 40;         // centre of the turnaround
      const RP = 16, RW = 18;         // pavement radius, sidewalk radius

      const g = [];
      for (let y = 0; y < H; y++) g.push(new Array(W).fill('G'));
      const set = (x, y, ch) => { if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = ch; };
      const rect = (x0, y0, x1, y1, ch) => {
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, ch);
      };
      const disc = (cx, cy, r, ch) => {
        for (let y = cy - r; y <= cy + r; y++) {
          for (let x = cx - r; x <= cx + r; x++) {
            const dx = x - cx, dy = y - cy;
            if (dx * dx + dy * dy <= r * r) set(x, y, ch);
          }
        }
      };
      const drive = (x0, y0, x1, y1) => rect(x0, y0, x1, y1, 'V');

      // treeline frame: solid, and stops the camera ever showing empty void
      rect(0, 0, W - 1, 2, 'X'); rect(0, H - 3, W - 1, H - 1, 'X');
      rect(0, 0, 2, H - 1, 'X'); rect(W - 3, 0, W - 1, H - 1, 'X');
      // The street out, running south off the bottom of the map. Stamped
      // BEFORE the bulb and started at the bulb's centre so the turnaround
      // overwrites it: otherwise the stem cuts a notch out of the island and
      // drags its sidewalks straight across the circle.
      rect(42, CY, 53, H - 1, 'S');
      rect(44, CY, 51, H - 1, 'R');
      // the bulb: sidewalk ring, pavement inside it, then a planted island in
      // the middle. Without the island the turnaround is a screen-filling slab
      // of grey with nothing in it.
      disc(CX, CY, RW, 'S'); disc(CX, CY, RP, 'R');
      disc(CX, CY, 7, 'S'); disc(CX, CY, 6, 'G');

      // [type, tileX, tileY]. Every house is 16x12; the front door sits on
      // local tiles 7-8 of the bottom row.
      const HOUSES = [
        ['houseMatt', 40, 4],   // 0 - Matt's, due north of the bulb
        ['houseA', 14, 8],      // 1
        ['houseB', 66, 8],      // 2
        ['houseC', 4, 44],      // 3
        ['houseD', 76, 44],     // 4
        ['houseOpen', 16, 76],  // 5 - the one with the garage standing open
        ['houseB', 62, 76],     // 6
        ['houseA', 16, 96],     // 7
      ];
      // driveways, hand-routed so none of them cross a neighbour's lot
      drive(46, 16, 49, 23);
      drive(20, 20, 23, 31); drive(20, 28, 37, 31);
      drive(72, 20, 75, 31); drive(59, 28, 75, 31);
      drive(10, 56, 13, 65); drive(10, 62, 43, 65);
      drive(82, 56, 85, 65); drive(52, 62, 85, 65);
      // to the open garage bay. These x values track where the dark opening
      // actually sits in houseOpen.png (tiles 24.6-29.3 measured off the
      // sprite). Re-measure if that art is ever regenerated: the bay moved
      // from the left of the house to the right when the AI art replaced the
      // code-drawn placeholder, and the portal silently stopped lining up.
      drive(25, 88, 28, 95); drive(25, 92, 43, 95);
      drive(68, 88, 71, 95); drive(52, 92, 71, 95);
      drive(22, 108, 25, 115); drive(22, 112, 43, 115);

      const objects = [];
      for (const h of HOUSES) objects.push([h[0], h[1], h[2]]);

      const inHouse = (x, y) => {
        for (const h of HOUSES) {
          if (x >= h[1] && x < h[1] + 16 && y >= h[2] && y < h[2] + 12) return true;
          // keep the ground in front of every door clear of scenery
          if (x >= h[1] + 5 && x < h[1] + 11 && y >= h[2] + 12 && y < h[2] + 15) return true;
        }
        return false;
      };
      // the island is grass too, so without this the scatter fills the middle
      // of the turnaround with a thicket instead of a planted centrepiece
      const onIsland = (x, y) => {
        const dx = x - CX, dy = y - CY;
        return dx * dx + dy * dy <= 100;
      };
      const free = (x, y, w, h) => {
        for (let yy = y; yy < y + h; yy++) {
          for (let xx = x; xx < x + w; xx++) {
            if (xx < 0 || xx >= W || yy < 0 || yy >= H) return false;
            if (g[yy][xx] !== 'G' || inHouse(xx, yy) || onIsland(xx, yy)) return false;
          }
        }
        return true;
      };
      // deterministic scatter, so the neighbourhood is identical every load
      const hash = (x, y, k) => {
        const n = Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453;
        return n - Math.floor(n);
      };
      const taken = [];
      const claim = (x, y, w, h) => {
        for (const t of taken) {
          if (x < t[0] + t[2] && x + w > t[0] && y < t[1] + t[3] && y + h > t[1]) return false;
        }
        taken.push([x, y, w, h]);
        return true;
      };
      for (let y = 4; y < H - 5; y += 3) {
        for (let x = 4; x < W - 5; x += 3) {
          const r = hash(x, y, 1);
          if (r > 0.80 && free(x, y, 2, 2) && claim(x, y, 2, 2)) objects.push(['tree', x, y]);
          else if (r > 0.70 && free(x, y, 1, 1) && claim(x, y, 1, 1)) objects.push(['bush', x, y]);
        }
      }

      // curbside furniture, hand-placed where it reads as a real street
      const props = [
        ['mailbox', 45, 22], ['mailbox', 38, 30], ['mailbox', 58, 30],
        ['mailbox', 41, 66], ['mailbox', 54, 66], ['mailbox', 41, 96],
        ['mailbox', 54, 96], ['mailbox', 41, 112],
        ['lamp', 30, 24], ['lamp', 66, 24], ['lamp', 30, 56], ['lamp', 66, 56],
        ['lamp', 40, 84], ['lamp', 55, 84], ['lamp', 40, 110],
        ['car', 46, 18], ['car', 72, 22], ['car', 82, 58], ['car', 22, 110],
        ['hoop', 51, 17], ['trash', 36, 32], ['trash', 60, 32], ['trash', 26, 96],
      ];
      for (const p of props) if (claim(p[1], p[2], 2, 3)) objects.push(p);
      // the island in the middle of the turnaround
      objects.push(['tree', 47, 38], ['bush', 44, 41], ['bush', 51, 41], ['bush', 47, 43]);
      // low hedges marking the lot lines either side of Matt's house
      for (let y = 6; y < 20; y += 1) { objects.push(['hedge', 36, y]); objects.push(['hedge', 59, y]); }

      const inter = [];
      // The rect runs one row PAST the bottom of the house on purpose. Matt's
      // own doorway tile is a portal, so if the rect stopped at the wall the
      // only tile you could examine it from would warp you indoors instead.
      const houseLook = (i, lines) => {
        const h = HOUSES[i];
        inter.push({ x: h[1] + 6, y: h[2] + 10, w: 4, h: 3, lines: lines });
      };
      houseLook(0, [
        'Home. Same chipped stucco, same dead patch by the hose.',
        'Two days ago I needed the handrail to get up those steps.',
        'I just walked down them without noticing they were there.' ]);
      houseLook(1, [
        'The Ngs. Their kid Denny used to bring my homework over on bad weeks.',
        'Their recycling has been out since Thursday. Nobody is home.' ]);
      houseLook(2, [
        'The blue house. Retired couple, immaculate lawn, opinions about my lawn.',
        'Curtains are shut. Saturday morning, everyone is somewhere else.' ]);
      houseLook(3, [
        'Peach house on the corner. Three cars, never the same three.',
        'Dad calls it "the dealership."' ]);
      houseLook(4, [
        'The white house. New family, moved in over the summer.',
        'I have waved at them exactly once, from a car window, on the way to chemo.' ]);
      houseLook(5, [
        'Garage door is up. It is always up.',
        'That is Mr. Okafor\'s weight room. He offered to "build me up" last spring.',
        'I laughed. I weighed a hundred and nine pounds.',
        '...the door is open. He is not home. And I need to know something.' ]);
      houseLook(6, [
        'Second blue house. The one with the trampoline nobody uses.' ]);
      houseLook(7, [
        'End of the street. The house that always has the good Halloween setup.' ]);
      inter.push({ x: 44, y: 116, w: 8, h: 3, lines: [
        'The road out of the cul-de-sac. Left at the stop sign is school.',
        'Right is the freeway, and then the whole rest of the world.',
        'One thing at a time, Matt.' ] });
      inter.push({ x: 42, y: 34, w: 12, h: 13, lines: [
        'The island in the middle of the circle. Learned to ride a bike around this.',
        'Broke my arm on it too. This whole street is a place where I was the slow kid.',
        'I could run a lap right now. I could probably run fifty.' ] });

      return {
        ground: g.map((row) => row.join('')),
        objects: objects,
        inter: inter,
        portals: [
          // Matt's front door, back inside
          { x: 752, y: 256, w: 32, h: 16, to: 'lower', dx: 240, dy: 232, face: 'up' },
          // the open garage bay on house 5, centred on the opening in the art
          { x: 416, y: 1408, w: 32, h: 16, to: 'garage', dx: 240, dy: 208, face: 'up' },
        ],
      };
    },
  },

  // The one interior beyond Matt's house: a neighbour's open garage. No NPC
  // needed to justify it being open, and the weight bench is the payoff for
  // everything the intro has been telling the player about Matt's body.
  garage: {
    ground: [
      'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
      'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
      'FccccccccccccccccccccccccccccF',
      'FccccccccccccccccccccccccccccF',
      'FccccccccccccccccccccccccccccF',
      'FccccccccccccccccccccccccccccF',
      'FccccccccccccccccccccccccccccF',
      'FccccccccccccccccccccccccccccF',
      'FccccccccccccccccccccccccccccF',
      'FccccccccccccccccccccccccccccF',
      'FccccccccccccccccccccccccccccF',
      'FccccccccccccccccccccccccccccF',
      'FccccccccccccccccccccccccccccF',
      'FccccccccccccccccccccccccccccF',
      'FccccccccccccccccccccccccccccF',
      'FFFFFFFFFFFFFFccFFFFFFFFFFFFFF',
      '..............................',
    ],
    objects: [
      ['workbench', 2, 2], ['boxes', 6, 2], ['boxes', 7, 2], ['trash', 9, 2],
      ['weightBench', 13, 7], ['weights', 12, 5], ['weights', 17, 9],
      ['boxes', 26, 2], ['boxes', 27, 3], ['boxes', 26, 5],
      ['car', 21, 2], ['weights', 4, 12], ['boxes', 2, 13], ['trash', 28, 13],
    ],
    inter: [
      { x: 13, y: 7, w: 2, h: 1, lines: [
        'A weight bench with more iron on the bar than I weighed in March.',
        'Mr. Okafor loads it and leaves it. Nobody else on this street touches it.',
        'I put one hand under it. Just to see.',
        'It came up like an empty laundry basket.',
        'I set it down very, very carefully and stood back.' ] },
      { x: 12, y: 5, w: 1, h: 1, lines: [
        'Dumbbells, biggest to smallest, all in a row.',
        'The little pink five-pounders at the end are the ones I used in physio.',
        'I could not do ten reps with those in April.' ] },
      { x: 2, y: 2, w: 3, h: 1, lines: [
        'Workbench. Coffee can of screws, a radio, somebody\'s half-fixed lamp.',
        'Smells like WD-40 and Saturday.' ] },
      { x: 26, y: 2, w: 2, h: 4, lines: [
        'Boxes labeled in marker: XMAS, DENNY SCHOOL, DO NOT OPEN.',
        'I am not going to open the one that says do not open. I have some manners.' ] },
      { x: 21, y: 2, w: 2, h: 3, lines: [
        'The half-restored muscle car. Hood on, wheels on, engine in pieces on a towel.',
        'He has been "two weekends away" from finishing it since I was fourteen.' ] },
    ],
    portals: [
      { x: 224, y: 240, w: 32, h: 16, to: 'outside', dx: 440, dy: 1432, face: 'down' },
    ],
  },
};
