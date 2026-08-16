# Paralation Furniture Generation Kit

(Tim's section, above the line.)

---

## Claude's working notes

## ART DIRECTION v2 (Aug 16 2026): READ THIS FIRST

The game moved OFF pixel art onto Ghibli painterly (Flux Dev + Ghibli LoRA).
make_workflows.py is the source of truth and all five paralation-* workflows in
the sidebar are already on the new stack: open one, press Run, done. Everything
below this section describing "pixel art / 32-bit SNES" prompts is HISTORICAL,
kept because the per-item text (the part between the trigger and the style
lock) and the magenta/colour rules still apply unchanged.

Current style lock (see full_prompt in make_workflows.py):
`Ghibli style, <item>, hand drawn animation prop|building, <view>, single
object centered on plain magenta background, no drop shadow, warm cozy colors,
soft painterly shading, game asset`

## How to run (Comfy Desktop)

1. Open Comfy Desktop. In the Workflows sidebar (folder icon, top left), open **paralation-furniture**. It is already installed in your workflow library, no dragging needed. The graph is the official Z Image Turbo layout (UNETLoader + CLIPLoader in lumina2 mode + ModelSamplingAuraFlow), verified working on your install via the API on Aug 15 2026: the bed in the game right now came out of this exact graph.
2. For each item in the shot list below:
   · In the positive prompt, replace only the item text (the part between "pixel art " and ", 32-bit SNES style"). Everything after it is the style lock, keep it identical.
   · Set the SaveImage filename_prefix to `paralation/<name>` (exactly the name in the list).
   · Queue 4 to 6 generations (Ctrl+Enter repeatedly). Z Image Turbo takes a few seconds each.
3. Outputs land in `E:\Comfy-Desktop\ComfyUI-Shared\output\paralation\`. Generate a handful per item; Claude will pick and clean them, or delete the ones you hate and keep favorites.
4. When a batch is ready, tell Claude "imports ready", or run the importer yourself:

```bash
python "C:\Users\Tim\1.  Working Projects\Paralation\comfy\import_asset.py" "E:\Comfy-Desktop\ComfyUI-Shared\output\paralation"
```

The importer keys out the background (flood fill from the border, interior whites survive), crops, pixelizes to the exact sprite size (32px per tile), quantizes the palette, and drops results into `Paralation\images\`. Reload the game and the new art is just there. The newest file per asset name wins, so delete rejects before importing or just regenerate and re-import.

## IMPORTANT: every prompt uses a MAGENTA background

The loaded workflow already says "plain magenta background", keep that for every item. The importer removes background by color and no furniture is magenta, so nothing real gets keyed out. It samples the image corners, so any solid background color works if magenta ever fights a prompt.

## Style lock (do not edit this part of the prompt)

`, 32-bit SNES style RPG furniture sprite, front view seen from the front and slightly above like Stardew Valley interior furniture, flat 2D, no perspective, single object centered on plain magenta background, no drop shadow, warm cozy colors, soft top-left lighting, clean dark outline, detailed shading, game asset`

Notes: there is no pixel art LoRA on the new Comfy Desktop install (the old E:\Comfy2 library did not migrate), the style comes entirely from this prompt and it works well. "Front view ... flat 2D, no perspective" matters: without it Z Image drifts isometric (the first bed did). Turbo models ignore negative prompts, so everything must be stated positively.

NEVER NAME A PINK, SALMON OR MAGENTA OBJECT. Z Image renders the "plain magenta background" as pink no matter what, and the importer separates the object from the background by color, so a pink object dissolves into the background. The rug wasted 19 candidates on "salmon pink area rug" before being changed to navy and cream. If an object genuinely should be pink in the game, generate it in another color and recolor it by hand.

## Exteriors (workflows 4 and 5, added Aug 15 2026)

Two more batch workflows cover everything outside the house plus the neighbour's garage, which are all still placeholder code art:

- **paralation-4-exterior**: the six house fronts, plus car, mailbox, lamp, hoop.
- **paralation-5-yard**: tree, bush, hedge, fence, trash, boxes, weightBench, weights, workbench.

Two things differ from workflows 1 to 3:

1. **Buildings use their own view text.** Instead of the furniture "front view ... like Stardew Valley interior furniture", houses say "front elevation view of the whole building, roof above the front wall, flat 2D, no perspective, no ground or grass beneath it". Without that last clause Z Image paints a lawn and a driveway into the sprite, which the importer cannot separate from the house.
2. **Latent shape now varies per item.** A house is drawn 4:3 and a lamp post is drawn tall, so a square 1024 frame threw away a quarter of the pixels on one and more than half on the other. Houses generate at 1216x896, tall props at 832x1216, everything else stays 1024x1024. The generator makes one latent node per distinct shape and shares it.

**Expect the houses to come out chunky.** Measured on the existing raws, Z Image draws roughly 32 to 60 genuinely independent pixels across a frame no matter how big that frame is. A house sprite is 512x384, so it will be far more oversampled than the furniture was. If they read too blocky next to the furniture, that is a prompt problem (push for finer pixel detail), not an importer setting. Judge the first batch before queueing hundreds.

## Shot list

Prefix each with `pixel art `, then the style lock above.

| name | item text |
|------|-----------|
| bed | teenager's single bed with green blanket and white pillow, wooden headboard |
| bedDouble | double bed with two pillows and dusty rose blanket, wooden headboard |
| nightstand | small wooden nightstand with an orange prescription pill bottle on top |
| bookshelf | tall wooden bookshelf full of colorful books and comics |
| desk | wooden computer desk with monitor, keyboard, red mug and eyeglasses on it |
| chair | simple wooden chair, front view |
| backpack | red school backpack sitting on the floor |
| dresser | wide low wooden dresser with two drawers and round knobs |
| plant | monstera houseplant in a terracotta pot |
| hallTable | narrow wooden hall table with a blue flower vase and letters on it |
| couch | warm brown leather couch with two seat cushions and rolled arms |
| tvStand | low wooden TV stand with a flat screen television on top |
| coffeeT | low wooden coffee table with a blue puzzle box on it |
| counter | kitchen base cabinet with light stone countertop |
| counterSink | kitchen counter with steel sink basin and faucet |
| counterNote | kitchen counter with a small handwritten note lying on top |
| stove | white kitchen stove with black burners and oven window |
| fridge | white refrigerator with door handles and fridge magnets |
| tableD | wooden dining table with a fruit bowl in the center |
| toilet | white porcelain toilet with tank |
| sinkP | white pedestal bathroom sink |
| tub | white bathtub filled with blue water |
| doorF | wooden four-panel front door with brass knob |
| mirrorW | gold framed wall mirror |
| poster | retro space rocket poster with dark blue background |
| windowW | white framed window showing blue sky and clouds |
| photoW | small framed photo of a family at the beach |

Rugs and mats are seen from directly overhead. For these three, ALSO replace "front view seen from the front and slightly above like Stardew Valley interior furniture" with "viewed directly from above, flat top-down":

| name | item text |
|------|-----------|
| rug | rectangular navy blue and cream braided area rug with a simple border pattern |
| rug2 | large area rug, cream center with burgundy border pattern |
| mat | small brown rectangular doormat with woven texture |

Skipped on purpose for now: stairsD, stairsU, railing (structural, handled in the floors-and-walls phase).

## Sprite target sizes

The importer knows every target size (2x the code-art sizes in sprites.js). Never resize by hand.
