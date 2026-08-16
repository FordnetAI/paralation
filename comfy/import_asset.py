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
}

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
# Distance from the FITTED local background, not from a corner sample. Chosen by
# sweeping: a real pocket IS the backdrop so it sits near zero, while the
# parents' dusty-pink bedding first gets nibbled at 28 and is destroyed at 34.
POCKET_THRESHOLD = 22
MIN_POCKET_AREA = 400  # px in the 1024 raw; below this it is speckle, not a gap
PALETTE_COLORS = 32


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


def pixelize(im, name):
    lw, lh = SIZES[name]
    tw, th = lw * 2, lh * 2
    bbox = im.getbbox()
    if bbox is None:
        raise ValueError('image is empty after background removal')
    im = im.crop(bbox)
    cw, ch = im.size
    f = min(tw / cw, th / ch)
    nw, nh = max(1, round(cw * f)), max(1, round(ch * f))

    # Alpha-weighted (premultiplied) downscale. key_background zeroes alpha but
    # LEAVES the background RGB in place, so a plain BOX resize area-averages
    # that pink into every edge pixel and rings the sprite with muddy fringe --
    # this was the dark halo around the toilet. Premultiplying means fully
    # transparent pixels contribute nothing, so edges take their colour only
    # from the object itself.
    src = np.asarray(im, dtype=np.float64)
    al = src[:, :, 3:4] / 255.0
    prem = np.concatenate([src[:, :, :3] * al, src[:, :, 3:4]], axis=2)
    small = np.asarray(
        Image.fromarray(prem.astype(np.uint8), 'RGBA').resize((nw, nh), Image.BOX),
        dtype=np.float64)
    sa = small[:, :, 3:4] / 255.0
    rgb_f = np.divide(small[:, :, :3], sa, out=np.zeros_like(small[:, :, :3]), where=sa > 0)
    im = Image.fromarray(
        np.concatenate([np.clip(rgb_f, 0, 255), small[:, :, 3:4]], axis=2).astype(np.uint8),
        'RGBA')

    # crisp alpha, then palette quantize the color channels
    alpha = im.getchannel('A').point(lambda a: 255 if a >= 128 else 0)
    rgb = im.convert('RGB').quantize(colors=PALETTE_COLORS, method=Image.MEDIANCUT).convert('RGB')
    out = Image.new('RGBA', (tw, th), (0, 0, 0, 0))
    sprite = rgb.convert('RGBA')
    sprite.putalpha(alpha)
    # furniture sits on the floor: anchor bottom-center
    out.paste(sprite, ((tw - nw) // 2, th - nh), sprite)
    return out


def import_one(path, name):
    if name not in SIZES:
        print('  SKIP %s: unknown asset name %r' % (os.path.basename(path), name))
        return False
    im = key_background(Image.open(path), aggressive=name in AGGRESSIVE_KEY)
    out = pixelize(im, name)
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
