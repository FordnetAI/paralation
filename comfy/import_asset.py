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
from collections import deque
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
BG_THRESHOLD = 60   # color distance from corner-sampled background color
# Distance from the FITTED local background, not from a corner sample. Chosen by
# sweeping: a real pocket IS the backdrop so it sits near zero, while the
# parents' dusty-pink bedding first gets nibbled at 28 and is destroyed at 34.
POCKET_THRESHOLD = 22
MIN_POCKET_AREA = 400  # px in the 1024 raw; below this it is speckle, not a gap
PALETTE_COLORS = 32


def key_background(im):
    """Make background pixels transparent. Background color is sampled from
    the four corners; removal flood-fills inward from the image border, so
    interior regions that happen to match the background color (white pillows
    on a white background, notes, mirror glass) are preserved as long as an
    outline separates them from the edge."""
    im = im.convert('RGBA')
    w, h = im.size
    px = im.load()
    corners = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
    br = sum(c[0] for c in corners) // 4
    bg = sum(c[1] for c in corners) // 4
    bb = sum(c[2] for c in corners) // 4
    lim = BG_THRESHOLD * 3

    def is_bg(p):
        return abs(p[0] - br) + abs(p[1] - bg) + abs(p[2] - bb) < lim

    visited = bytearray(w * h)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if not visited[y * w + x] and is_bg(px[x, y]):
                visited[y * w + x] = 1
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if not visited[y * w + x] and is_bg(px[x, y]):
                visited[y * w + x] = 1
                q.append((x, y))
    while q:
        x, y = q.popleft()
        r, g, b, _ = px[x, y]
        px[x, y] = (r, g, b, 0)
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not visited[ny * w + nx] and is_bg(px[nx, ny]):
                visited[ny * w + nx] = 1
                q.append((nx, ny))

    # Enclosed pockets. The flood fill above only reaches background connected
    # to the border, so a gap ringed by the object -- a chair's backrest slot,
    # the space between a table's legs -- survives as solid background colour.
    # Harmless when the backdrop was white; glaring on hot pink.
    #
    # These backdrops are NOT flat: they carry a vignette, so a fixed distance
    # from the corner colour cannot separate background from a terracotta pot
    # or dusty pink bedding (measured: the backdrop varies by up to 34 across
    # one image, which is the same ballpark as the gap to those objects).
    # Instead fit the backdrop's own gradient from the pixels the flood fill
    # already proved were background, then compare each survivor to the fit AT
    # ITS OWN POSITION.
    a = np.asarray(im, dtype=np.int16)
    est = _bg_surface(a)
    if est is not None:
        d = np.abs(a[:, :, :3].astype(np.float64) - est).sum(axis=2)
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
            im = Image.fromarray(a.astype(np.uint8), 'RGBA')
    return im


def _bg_surface(a):
    """Least-squares quadratic fit of the backdrop, trained only on pixels the
    border flood fill already cleared. Returns an h*w*3 estimate of what the
    backdrop looks like at every position, vignette included."""
    h, w, _ = a.shape
    ys, xs = np.nonzero(a[:, :, 3] == 0)
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
    im = key_background(Image.open(path))
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
