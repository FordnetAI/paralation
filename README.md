# Paralation

*it grows on you*

A top-down RPG in the spirit of Stardew Valley and the original Pokemon interiors.

Matt Ford is eighteen, nerdy, small, half-blind, and two years into leukemia treatment. On a school trip to a forest in Arizona something bit his neck. He went to bed sick. He woke up strong, with perfect eyesight, and no idea why.

The game opens in his bedroom, the morning he wakes up changed.

## Play it

No build step, no dependencies. Open `index.html` in a browser, or serve the folder:

```bash
node dev-server.js . shots 8321
```

Then visit `http://localhost:8321`.

| | |
|---|---|
| Move | WASD or arrow keys |
| Run | hold Shift |
| Look at something | E, Space or Enter |
| Character sheet | C or Tab |

Examining things for the first time grants XP. Matt will not leave the house until he has taken stock of five specific things, and he will tell you which ones are still worth a look.

## What is here

Two floors of the family house, a cul-de-sac of eight houses with large yards, and one neighbour's garage you can walk into. Stats, levelling, sprint and stamina. No save system yet, so a refresh starts the morning over.

## How it is built

Vanilla JavaScript and a single canvas. No framework, no bundler, no package.json.

- `sprites.js` - every sprite generated at load time onto offscreen canvases. Characters are pixel-string grids, everything else is layered rectangles.
- `maps.js` - map layouts, object placement, examine text, portals.
- `stats.js` - Matt's stat block and the XP curve.
- `game.js` - loop, input, collision, camera, dialogue, rendering.
- `images/` - optional hi-res PNG overrides. Any `images/<spriteName>.png` replaces that sprite at boot; anything missing falls back to the code-drawn version. Furniture art is AI-generated through the pipeline in `comfy/`; the exteriors are still placeholder code art.

The viewport is 480x272 logical pixels on a 960x544 canvas. Interiors are exactly one screen. The cul-de-sac is 96x120 tiles and scrolls.

## Credit

Built by Tim Fordham with Claude.
