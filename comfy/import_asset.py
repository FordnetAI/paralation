"""Paralation asset importer.

Converts raw ComfyUI furniture generations (1024x1024, object on white
background) into game-ready sprites: background keyed out, cropped,
pixelized to the exact 32px-per-tile sprite size, palette quantized,
anchored bottom-center, saved into Paralation/images/<name>.png.

Usage:
  python import_asset.py <file.png> <assetName>     one file, explicit name
  python import_asset.py <folder>                   batch: names inferred from
                                                    filename prefix, newest file
                                                    per asset wins
"""
import sys
import os
import re
import numpy as np
from scipy import ndimage
from PIL import Image

# logical (16px-scale) sprite sizes from sprites.js defs; output is 2x these
SIZES = {
    'bed': (32, 52), 'nightstand': (16, 22), 'bookshelf': (32, 40),
    'desk': (48, 30), 'chair': (14, 18), 'backpack': (14, 15),
    'rug': (64, 48), 'rug2': (80, 80), 'toilet': (16, 22),
    'sinkP': (16, 24), 'tub': (32, 30), 'bedDouble': (48, 52),
    'dresser': (32, 26), 'plant': (16, 24), 'hallTable': (32, 26),
    'railing': (16, 48), 'couch': (48, 30), 'tvStand': (48, 34),
    'coffeeT': (32, 20), 'counter': (16, 28), 'counterSink': (16, 28),
    'counterNote': (16, 28), 'stove': (16, 28), 'fridge': (16, 34),
    'tableD': (48, 34), 'mat': (32, 12), 'stairsD': (32, 64),
    'stairsU': (32, 64), 'doorF': (32, 26), 'mirrorW': (12, 22),
    'poster': (14, 18), 'windowW': (32, 24), 'photoW': (12, 14),
    # exteriors and garage props (phase 2). Houses are 16x12 tiles, so their
    # output is 512x384 -- by far the largest sprites in the game.
    'houseMatt': (256, 192), 'houseA': (256, 192), 'houseB': (256, 192),
    'houseC': (256, 192), 'houseD': (256, 192), 'houseOpen': (256, 192),
    'tree': (48, 76), 'bush': (22, 20), 'hedge': (16, 18), 'mailbox': (14, 26),
    'fence': (16, 20), 'lamp': (14, 58), 'car': (32, 50), 'trash': (16, 24),
    'hoop': (22, 62), 'weightBench': (32, 26), 'weights': (26, 16),
    'workbench': (48, 30), 'boxes': (24, 26),
    # the village + school (workflows 6-8). PROVISIONAL until their maps are
    # built: footprints may get retuned when the high street is laid out.
    'pubBell': (192, 168), 'pubGoat': (192, 168), 'shopSM': (160, 168),
    'shopOther': (160, 168), 'butcher': (144, 160), 'indian': (160, 168),
    'postOffice': (144, 160), 'changingRooms': (192, 96), 'socialClub': (224, 144),
    'swings': (80, 56), 'seesaw': (64, 32), 'roundabout': (56, 40),
    'goalFootball': (64, 44), 'benchP': (48, 28), 'planter': (32, 24),
    'pillarBox': (16, 36), 'signV': (24, 48), 'binV': (16, 28),
    'posterCat': (16, 22), 'flyerTrip': (16, 22),
    'schoolMain': (384, 208), 'schoolGym': (256, 160), 'schoolGate': (96, 64),
    'flagpole': (16, 80), 'busCoach': (96, 52), 'bikeShed': (96, 56),
    'standSmall': (128, 72),
    'portraitMatt': (48, 48),
}

# Seamless ground/wall textures (art phase 2). NOT keyed -- a texture IS
# background. Square-cropped, downscaled to 256px (= 8x8 game tiles at hi-res),
# and edge-blended so the engine can wrap it without a visible seam.
TEXTURES = {
    'tex-grass', 'tex-road', 'tex-paving', 'tex-wood', 'tex-bath', 'tex-kitchen',
    'tex-wallBlue', 'tex-wallAqua', 'tex-wallRose', 'tex-wallCream',
    'tex-wallWood', 'tex-wallGrey',
}
TEX_SIZE = 256
TEX_BLEND = 20  # px of edge crossfade toward the opposite edge

# Full-frame art, shown whole: cover-cropped to an exact size, never keyed.
FULLFRAME = {'title': (960, 544)}

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'images')
# Two-stage keying thresholds (sum-abs RGB distance):
# SEED vs the corner average finds pixels that are unmistakably backdrop; the
# measured backdrop vignette varies by up to ~34, so 60 covers all of it while
# staying far from any object colour. EXPAND is measured against the FITTED
# backdrop surface, so it can be tight too. The old single-pass threshold was
# 180, and the houses proved that wrong: their pale tan siding sits ~130 from
# the pink corner sample, so wherever the outline had a one-pixel gap the fill
# poured through and ate the walls (grass showed through the sprite in game).
SEED_THRESHOLD = 60
EXPAND_THRESHOLD = 45
# Shaded-backdrop test, used during expansion: a drop shadow is the backdrop
# multiplied by a shade factor, so a shadow pixel is close to s*fitted for some
# s. Residual is the L1 distance from that best scalar fit; the s range stops
# bright object colours (cream walls hit s=1.48) from matching. Measured worst
# case on the object side is the open garage mouth at residual 42.
SHADE_RESID = 32
SHADE_RANGE = (0.32, 1.25)
# Assets whose raws light up the backdrop around them (glow). Additive glow is
# neither near the fit nor a scalar shade of it, so those assets key with a
# wide expansion distance instead -- safe exactly because their object colours
# (near-black ironwork, bright warm lantern) are far from any pink.
AGGRESSIVE_KEY = {'lamp'}
AGGRESSIVE_EXPAND = 170
# Opaque islands smaller than this that are separate from the main silhouette
# are leftover backdrop residue (specks, detached shadow smudges), not art.
MIN_ISLAND = 250
# Backdrop-coloured fringe: the generator decorates some sprites with tufts and
# smudges in the backdrop's own pink (grass tufts at house bases, despite the
# prompt). Magenta-family means r > b and b > g by a margin -- a colour the
# objects themselves never use except in LARGE fields (the parents' duvet, the
# pink rug), so only small components touching transparency are removed.
FRINGE_B_MINUS_G = 8
MAX_FRINGE_COMP = 800
# Comic outline: every sprite gets a uniform near-black contour around its
# silhouette (Tim's call, Aug 16 2026: full asset separation from any ground).
# 0 as of the Ghibli era (Tim's call, Aug 16 2026): the comic outline was a
# pixel-art-era device for asset separation; painterly sprites carry their own
# painted edges and the render-side contact shadows do the grounding. The
# outline machinery below stays intact -- set this back to 2 to bring it back.
OUTLINE = 0
OUTLINE_RGBA = (14, 11, 18, 255)
# Distance from the FITTED local background, not from a corner sample. Chosen by
# sweeping: a real pocket IS the backdrop so it sits near zero, while the
# parents' dusty-pink bedding first gets nibbled at 28 and is destroyed at 34.
POCKET_THRESHOLD = 22
MIN_POCKET_AREA = 400  # px in the 1024 raw; below this it is speckle, not a gap


def key_background(im, aggressive=False):
    """Make background pixels transparent, in stages.

    Stage 1, seed: flood from the border over pixels within SEED_THRESHOLD of
    the corner-sampled backdrop colour. Deliberately tight: it only has to
    catch unmistakable backdrop, and a tight limit cannot leak through outline
    gaps into pale walls the way the old single 180 threshold did (that bug ate
    the house siding and let the grass show through the sprites in game).

    Stage 2, expand: fit the backdrop's own gradient (vignette included) from
    the seed pixels, then grow the cleared region into anything that is either
    within EXPAND_THRESHOLD of the fit AT ITS OWN POSITION, or reads as a
    SHADED version of the fit (drop shadows: the backdrop times a scale
    factor). Connectivity still rules: only pixels reachable from the border
    are removed, so interior regions that merely resemble the backdrop (white
    pillows, mirror glass, notes) survive exactly as before.

    Stage 3, pockets: regions fully enclosed by the object -- a chair's
    backrest slot, the gap between table legs -- never connect to the border,
    so they are cleared by fit distance alone, guarded by enclosure and a
    minimum area so genuine object colours are never eaten.

    Stage 4, islands: small opaque fragments disconnected from the main
    silhouette are backdrop residue (specks, detached shadow smudges).
    """
    im = im.convert('RGBA')
    a = np.asarray(im, dtype=np.int16).copy()
    h, w, _ = a.shape
    rgb = a[:, :, :3].astype(np.float64)
    corners = np.stack([a[0, 0, :3], a[0, w - 1, :3],
                        a[h - 1, 0, :3], a[h - 1, w - 1, :3]]).astype(np.float64)
    cavg = corners.mean(axis=0)

    border = np.zeros((h, w), dtype=bool)
    border[0, :] = border[-1, :] = True
    border[:, 0] = border[:, -1] = True
    seedable = np.abs(rgb - cavg).sum(axis=2) < SEED_THRESHOLD
    cleared = ndimage.binary_propagation(border & seedable, mask=seedable)

    est = _bg_surface(a, cleared)
    if est is not None:
        lim = AGGRESSIVE_EXPAND if aggressive else EXPAND_THRESHOLD
        removable = np.abs(rgb - est).sum(axis=2) < lim
        if not aggressive:
            # drop shadows: best scalar s per pixel such that p ~ s * fitted
            denom = (est * est).sum(axis=2)
            s = (rgb * est).sum(axis=2) / np.maximum(denom, 1)
            resid = np.abs(rgb - s[:, :, None] * est).sum(axis=2)
            removable |= ((resid < SHADE_RESID) &
                          (s > SHADE_RANGE[0]) & (s < SHADE_RANGE[1]))
        cleared = ndimage.binary_propagation(cleared, mask=cleared | removable)
    a[:, :, 3][cleared] = 0

    if est is not None:
        d = np.abs(rgb - est).sum(axis=2)
        pocket = (d < POCKET_THRESHOLD) & (a[:, :, 3] > 0)
        # Require pockets to be genuinely ENCLOSED. The flood fill already
        # cleared everything reachable from the border, so a real pocket cannot
        # touch the transparent region. Anything that does is a colour match
        # nibbling the object's outline -- it was eating the edge of the
        # parents' bedding, which is nearly the same pink as the backdrop.
        if pocket.any():
            lab, n = ndimage.label(pocket)
            if n:
                touching = np.unique(lab[ndimage.binary_dilation(a[:, :, 3] == 0) & pocket])
                bad = set(int(v) for v in touching if v > 0)
                # ...and big enough to be a real gap. A chair's backrest slot is
                # thousands of pixels; what was nibbling the bedding was specks.
                sizes = ndimage.sum(pocket, lab, range(1, n + 1))
                bad.update(i + 1 for i, s in enumerate(sizes) if s < MIN_POCKET_AREA)
                if bad:
                    pocket &= ~np.isin(lab, list(bad))
        if pocket.any():
            a[:, :, 3][pocket] = 0

    # stage 4: drop small opaque islands disconnected from the main silhouette
    op = a[:, :, 3] > 0
    lab, n = ndimage.label(op)
    if n > 1:
        sizes = ndimage.sum(op, lab, range(1, n + 1))
        main = sizes.max()
        junk = [i + 1 for i, sz in enumerate(sizes)
                if sz < MIN_ISLAND and sz < 0.05 * main]
        if junk:
            a[:, :, 3][np.isin(lab, junk)] = 0

    # stage 5: small backdrop-coloured (magenta-family) clumps hanging off the
    # silhouette -- pink grass tufts at house bases, edge smudges. Component
    # size protects legitimately pink art: the duvet and the rug are single
    # components tens of thousands of pixels big.
    op = a[:, :, 3] > 0
    fam = op & (a[:, :, 0] > a[:, :, 2]) & (a[:, :, 2] > a[:, :, 1] + FRINGE_B_MINUS_G)
    if fam.any():
        lab, n = ndimage.label(fam)
        if n:
            near_clear = ndimage.binary_dilation(~op)
            touching = set(int(v) for v in np.unique(lab[near_clear & fam]) if v > 0)
            sizes = ndimage.sum(fam, lab, range(1, n + 1))
            junk = [i for i in touching if sizes[i - 1] < MAX_FRINGE_COMP]
            if junk:
                a[:, :, 3][np.isin(lab, junk)] = 0

    return Image.fromarray(a.astype(np.uint8), 'RGBA')


def _bg_surface(a, cleared=None):
    """Least-squares quadratic fit of the backdrop, trained only on pixels
    already proven to be background (the `cleared` mask if given, else the
    transparent pixels). Returns an h*w*3 estimate of what the backdrop looks
    like at every position, vignette included."""
    h, w, _ = a.shape
    if cleared is None:
        cleared = a[:, :, 3] == 0
    ys, xs = np.nonzero(cleared)
    if len(xs) < 256:
        return None
    X, Y = xs / w - 0.5, ys / h - 0.5
    A = np.stack([np.ones_like(X), X, Y, X * X, X * Y, Y * Y], axis=1)
    gy, gx = np.mgrid[0:h, 0:w]
    GX, GY = gx / w - 0.5, gy / h - 0.5
    B = np.stack([np.ones_like(GX), GX, GY, GX * GX, GX * GY, GY * GY], axis=2)
    out = np.zeros((h, w, 3))
    for c in range(3):
        coef, *_ = np.linalg.lstsq(A, a[ys, xs, c].astype(np.float64), rcond=None)
        out[:, :, c] = B @ coef
    return out


def pixelize(im, name, outline=OUTLINE):
    """Cut a keyed generation down to its game sprite.

    Art direction v2 (Ghibli painterly): the downscale is LANCZOS with soft
    alpha, and there is no palette quantize -- smooth painterly gradients are
    the point of the new style. The name 'pixelize' survives from the pixel-art
    era so callers did not have to change. Keying, bottom-centre anchoring and
    the comic outline all behave exactly as before.
    """
    lw, lh = SIZES[name]
    tw, th = lw * 2, lh * 2
    bbox = im.getbbox()
    if bbox is None:
        raise ValueError('image is empty after background removal')
    im = im.crop(bbox)
    cw, ch = im.size
    # leave room for the outward comic outline on all four sides
    f = min((tw - 2 * outline) / cw, (th - 2 * outline) / ch)
    nw, nh = max(1, round(cw * f)), max(1, round(ch * f))

    # Alpha-weighted (premultiplied) downscale, so keyed-out backdrop RGB
    # contributes nothing and edges take their colour only from the object.
    src = np.asarray(im, dtype=np.float64)
    al = src[:, :, 3:4] / 255.0
    prem = np.concatenate([src[:, :, :3] * al, src[:, :, 3:4]], axis=2)
    small = np.asarray(
        Image.fromarray(prem.astype(np.uint8), 'RGBA').resize((nw, nh), Image.LANCZOS),
        dtype=np.float64)
    sa = np.clip(small[:, :, 3:4], 0, 255) / 255.0
    rgb_f = np.divide(small[:, :, :3], np.maximum(sa, 1e-6),
                      out=np.zeros_like(small[:, :, :3]), where=sa > 1e-6)
    # kill sub-visible alpha haze but keep soft anti-aliased edges
    a8 = np.clip(small[:, :, 3:4], 0, 255)
    a8[a8 < 24] = 0
    sprite = Image.fromarray(
        np.concatenate([np.clip(rgb_f, 0, 255), a8], axis=2).astype(np.uint8), 'RGBA')

    out = Image.new('RGBA', (tw, th), (0, 0, 0, 0))
    # furniture sits on the floor: anchor bottom-center, above the outline gap
    out.paste(sprite, ((tw - nw) // 2, th - nh - outline), sprite)
    if outline > 0:
        arr = np.asarray(out).copy()
        # comic contour: dilate the silhouette outward into near-black with a
        # CROSS kernel. Diamond growth chamfers diagonal steps to 45 degrees.
        # The outline overwrites the soft edge band OUTSIDE the solid core, so
        # the line stays clean against any ground.
        cross = np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]], bool)
        op = arr[:, :, 3] > 128
        ring = ndimage.binary_dilation(op, structure=cross, iterations=outline) & ~op
        arr[ring] = OUTLINE_RGBA
        out = Image.fromarray(arr)
    return out


def import_texture(path, name):
    im = Image.open(path).convert('RGB')
    s = min(im.size)
    left, top = (im.width - s) // 2, (im.height - s) // 2
    im = im.crop((left, top, left + s, top + s)).resize((TEX_SIZE, TEX_SIZE), Image.LANCZOS)
    # crossfade each edge toward its opposite edge so tiling wraps cleanly
    a = np.asarray(im, dtype=np.float64)
    M = TEX_BLEND
    for i in range(M):
        w = 0.5 * (1 - i / M)
        a[i], a[-1 - i] = (a[i] * (1 - w) + a[-1 - i] * w,
                           a[-1 - i] * (1 - w) + a[i] * w)
        a[:, i], a[:, -1 - i] = (a[:, i] * (1 - w) + a[:, -1 - i] * w,
                                 a[:, -1 - i] * (1 - w) + a[:, i] * w)
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGB')


def import_fullframe(path, size):
    im = Image.open(path).convert('RGB')
    tw, th = size
    f = max(tw / im.width, th / im.height)
    im = im.resize((round(im.width * f), round(im.height * f)), Image.LANCZOS)
    left, top = (im.width - tw) // 2, (im.height - th) // 2
    return im.crop((left, top, left + tw, top + th))


def import_one(path, name):
    if name in TEXTURES:
        out = import_texture(path, name)
    elif name in FULLFRAME:
        out = import_fullframe(path, FULLFRAME[name])
    elif name in SIZES:
        im = key_background(Image.open(path), aggressive=name in AGGRESSIVE_KEY)
        out = pixelize(im, name)
    else:
        print('  SKIP %s: unknown asset name %r' % (os.path.basename(path), name))
        return False
    os.makedirs(OUT_DIR, exist_ok=True)
    dest = os.path.join(OUT_DIR, name + '.png')
    out.save(dest)
    print('  OK %s -> %s (%dx%d)' % (os.path.basename(path), dest, out.width, out.height))
    return True


def infer_name(filename):
    """ComfyUI names outputs like bed_00003_.png; take the part before the
    first _NNNNN counter group."""
    stem = os.path.splitext(os.path.basename(filename))[0]
    m = re.match(r'(.+?)_\d{3,}_?$', stem)
    return m.group(1) if m else stem


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(1)
    target = args[0]
    if os.path.isdir(target):
        newest = {}
        for fn in os.listdir(target):
            if not fn.lower().endswith('.png'):
                continue
            name = infer_name(fn)
            full = os.path.join(target, fn)
            if name not in newest or os.path.getmtime(full) > os.path.getmtime(newest[name]):
                newest[name] = full
        if not newest:
            print('no .png files found in ' + target)
            sys.exit(1)
        done, failed = 0, 0
        for name, full in sorted(newest.items()):
            try:
                done += import_one(full, name)
            except Exception as e:
                failed += 1
                print('  FAIL %s (%s): %s' % (os.path.basename(full), name, e))
        print('imported %d asset(s) into %s%s' % (
            done, os.path.abspath(OUT_DIR),
            ', %d failed' % failed if failed else ''))
        if failed:
            sys.exit(1)
    else:
        name = args[1] if len(args) > 1 else infer_name(target)
        try:
            import_one(target, name)
        except Exception as e:
            print('  FAIL %s (%s): %s' % (os.path.basename(target), name, e))
            sys.exit(1)


if __name__ == '__main__':
    main()
