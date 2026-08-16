"""Generates the Paralation batch-generation workflows.

Each workflow has one shared loader stack (Z Image Turbo) feeding ~10
generation chains; every chain is pre-filled with its item prompt and its
paralation/<name> save prefix, so running the whole workflow once produces
one candidate image for ten different assets.

Outputs, for each workflow:
  - <name>.json      ComfyUI UI format, written here AND installed into the
                     Comfy Desktop workflow library so it appears in the
                     Workflows sidebar
  - <name>.api.json  API format, used to queue runs programmatically

Run:  python make_workflows.py
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
LIBRARY = r'E:\Comfy-Desktop\ComfyUI\ComfyUI\user\default\workflows'

UNET = 'z_image_turbo_bf16.safetensors'
CLIP = 'qwen_3_4b_fp8_mixed.safetensors'
VAE = 'z_image_ae.safetensors'

VIEWS = {
    'front': ('front view seen from the front and slightly above like Stardew Valley '
              'interior furniture, flat 2D, no perspective'),
    'top': 'viewed directly from above, flat top-down',
    # Buildings read best as a flat elevation, the way Pokemon and Stardew draw
    # houses: you see the front wall and the roof above it, never the sides.
    'ext': ('front elevation view of the whole building, roof above the front wall, '
            'flat 2D, no perspective, no ground or grass beneath it'),
}

# Latent shape per item. Everything was 1024x1024 originally, which is right for
# roughly square props but throws away a quarter of the frame on a house that is
# drawn 4:3, and more than half on a lamp post.
SQUARE, WIDE, TALL = (1024, 1024), (1216, 896), (832, 1216)


def full_prompt(item_text, view='front'):
    kind = 'building' if view == 'ext' else 'furniture'
    return ('pixel art %s, 32-bit SNES style RPG %s sprite, %s, '
            'single object centered on plain magenta background, no drop shadow, '
            'warm cozy colors, soft top-left lighting, clean dark outline, '
            'detailed shading, game asset' % (item_text, kind, VIEWS[view]))


# (assetName, item text, view[, latent size])
#
# COLOUR RULE, learned the hard way on the rug: the backdrop is magenta/pink, so
# never ask for a pink, salmon or terracotta object. All 19 salmon rug candidates
# were unusable because the corner-key had nothing to separate. Roofs in
# particular want grey, charcoal, brown or slate, never terracotta tile.
WORKFLOWS = {
    'paralation-1-bedroom': [
        ('bed', "teenager's single bed with green blanket and white pillow, wooden headboard", 'front'),
        ('bedDouble', 'double bed with two pillows and dusty rose blanket, wooden headboard', 'front'),
        ('nightstand', 'small wooden nightstand with an orange prescription pill bottle on top', 'front'),
        ('bookshelf', 'tall wooden bookshelf full of colorful books and comics', 'front'),
        ('desk', 'wooden computer desk with monitor, keyboard, red mug and eyeglasses on it', 'front'),
        ('chair', 'simple wooden chair', 'front'),
        ('backpack', 'red school backpack sitting on the floor', 'front'),
        ('dresser', 'wide low wooden dresser with two drawers and round knobs', 'front'),
        ('poster', 'retro space rocket poster with dark blue background', 'front'),
        ('mirrorW', 'gold framed wall mirror', 'front'),
    ],
    'paralation-2-living': [
        ('couch', 'warm brown leather couch with two seat cushions and rolled arms', 'front'),
        ('tvStand', 'low wooden TV stand with a flat screen television on top', 'front'),
        ('coffeeT', 'low wooden coffee table with a blue puzzle box on it', 'front'),
        ('hallTable', 'narrow wooden hall table with a blue flower vase and letters on it', 'front'),
        ('plant', 'monstera houseplant in a terracotta pot', 'front'),
        ('tableD', 'wooden dining table with a fruit bowl in the center', 'front'),
        ('photoW', 'small framed photo of a family at the beach', 'front'),
        ('doorF', 'wooden four-panel front door with brass knob', 'front'),
        ('windowW', 'white framed window showing blue sky and clouds', 'front'),
        # Do NOT give this one a pink/salmon color: the background is pink, so a
        # pink rug leaves the importer's corner-key nothing to separate. Every
        # one of the 19 salmon-pink candidates was unusable. Contrast is the fix.
        ('rug', 'rectangular navy blue and cream braided area rug with a simple '
                'border pattern', 'top'),
    ],
    'paralation-3-kitchen-bath': [
        ('counter', 'kitchen base cabinet with light stone countertop', 'front'),
        ('counterSink', 'kitchen counter with steel sink basin and faucet', 'front'),
        ('counterNote', 'kitchen counter with a small handwritten note lying on top', 'front'),
        ('stove', 'white kitchen stove with black burners and oven window', 'front'),
        ('fridge', 'white refrigerator with door handles and fridge magnets', 'front'),
        ('toilet', 'white porcelain toilet with tank', 'front'),
        ('sinkP', 'white pedestal bathroom sink', 'front'),
        ('tub', 'white bathtub filled with blue water', 'front'),
        ('rug2', 'large area rug, cream center with burgundy border pattern', 'top'),
        ('mat', 'small brown rectangular doormat with woven texture', 'top'),
    ],
    'paralation-4-exterior': [
        ('houseMatt', 'two story suburban family house, cream stucco walls, slate grey '
                      'shingle roof, navy blue front door, two upstairs windows', 'ext', WIDE),
        ('houseA', 'two story suburban house, sage green wood siding, dark brown roof, '
                   'white closed garage door on the left, brown front door', 'ext', WIDE),
        ('houseB', 'two story suburban house, pale blue wood siding, charcoal roof, '
                   'dark red front door, white window trim', 'ext', WIDE),
        ('houseC', 'two story suburban house, tan adobe walls, dark brown roof, '
                   'deep green front door, closed garage door', 'ext', WIDE),
        ('houseD', 'two story suburban house, white wood siding, blue grey roof, '
                   'dark purple front door, shuttered windows', 'ext', WIDE),
        ('houseOpen', 'two story suburban house, beige siding, dark brown roof, with its '
                      'garage door rolled up showing a dark empty garage bay', 'ext', WIDE),
        ('car', 'dark red sedan car, roof windshield and hood visible', 'top'),
        ('mailbox', 'american suburban mailbox on a wooden post with a small red flag',
         'front', TALL),
        ('lamp', 'tall street lamp post with a glowing lantern head', 'front', TALL),
        ('hoop', 'basketball hoop, white backboard and orange rim on a metal pole',
         'front', TALL),
    ],
    'paralation-5-yard': [
        ('tree', 'large leafy oak tree with a thick brown trunk and full green canopy',
         'front', TALL),
        ('bush', 'small round green garden shrub', 'front'),
        ('hedge', 'low neatly trimmed green boxwood hedge block', 'front'),
        ('fence', 'short section of white picket fence, four pickets', 'front'),
        ('trash', 'green wheeled garbage bin with a closed lid', 'front'),
        ('boxes', 'stack of two brown cardboard moving boxes', 'front'),
        ('weightBench', 'black padded weight lifting bench with steel legs', 'front'),
        ('weights', 'steel barbell loaded with round black weight plates', 'front'),
        ('workbench', 'wooden garage workbench with hand tools scattered on top', 'front'),
    ],
}


def unpack(item):
    """(name, text, view) or (name, text, view, latent size)."""
    name, text, view = item[0], item[1], item[2]
    return name, text, view, (item[3] if len(item) > 3 else SQUARE)


def build_ui(items):
    nodes, links = [], []
    lid = [0]

    def node(nid, ntype, pos, size, widgets, n_in=None, n_out=None):
        n = {
            'id': nid, 'type': ntype, 'pos': pos, 'size': size, 'flags': {},
            'order': len(nodes), 'mode': 0,
            'properties': {'Node name for S&R': ntype},
            'widgets_values': widgets,
        }
        if n_in:
            n['inputs'] = [{'name': a, 'type': t, 'link': None} for a, t in n_in]
        if n_out:
            n['outputs'] = [{'name': a, 'type': t, 'links': [], 'slot_index': i}
                            for i, (a, t) in enumerate(n_out)]
        nodes.append(n)
        return n

    def connect(src, fslot, dst, tslot, typ):
        lid[0] += 1
        links.append([lid[0], src['id'], fslot, dst['id'], tslot, typ])
        src['outputs'][fslot]['links'].append(lid[0])
        dst['inputs'][tslot]['link'] = lid[0]

    unet = node(1, 'UNETLoader', [40, 80], [340, 82], [UNET, 'default'],
                n_out=[('MODEL', 'MODEL')])
    aura = node(2, 'ModelSamplingAuraFlow', [40, 210], [340, 58], [3],
                n_in=[('model', 'MODEL')], n_out=[('MODEL', 'MODEL')])
    clip = node(3, 'CLIPLoader', [40, 320], [340, 106], [CLIP, 'lumina2', 'default'],
                n_out=[('CLIP', 'CLIP')])
    vae = node(4, 'VAELoader', [40, 480], [340, 58], [VAE],
               n_out=[('VAE', 'VAE')])
    neg = node(6, 'CLIPTextEncode', [40, 750], [340, 96], [''],
               n_in=[('clip', 'CLIP')], n_out=[('CONDITIONING', 'CONDITIONING')])
    zero = node(7, 'ConditioningZeroOut', [40, 900], [340, 46], [],
                n_in=[('conditioning', 'CONDITIONING')],
                n_out=[('CONDITIONING', 'CONDITIONING')])
    connect(unet, 0, aura, 0, 'MODEL')
    connect(clip, 0, neg, 0, 'CLIP')
    connect(neg, 0, zero, 0, 'CONDITIONING')
    # one latent node per distinct shape, shared by every chain that wants it
    lats, lat_ids = {}, [5, 8, 9]
    for i, sz in enumerate(sorted({unpack(it)[3] for it in items})):
        lats[sz] = node(lat_ids[i], 'EmptySD3LatentImage', [40, 590 + i * 130],
                        [340, 106], [sz[0], sz[1], 1], n_out=[('LATENT', 'LATENT')])

    nid = 30
    for i, item in enumerate(items):
        name, text, view, sz = unpack(item)
        y = 60 + i * 240
        p = node(nid, 'CLIPTextEncode', [480, y], [430, 170], [full_prompt(text, view)],
                 n_in=[('clip', 'CLIP')], n_out=[('CONDITIONING', 'CONDITIONING')])
        k = node(nid + 1, 'KSampler', [960, y], [315, 262],
                 [123450 + i, 'randomize', 8, 1, 'res_multistep', 'simple', 1],
                 n_in=[('model', 'MODEL'), ('positive', 'CONDITIONING'),
                       ('negative', 'CONDITIONING'), ('latent_image', 'LATENT')],
                 n_out=[('LATENT', 'LATENT')])
        d = node(nid + 2, 'VAEDecode', [1320, y], [210, 46], [],
                 n_in=[('samples', 'LATENT'), ('vae', 'VAE')],
                 n_out=[('IMAGE', 'IMAGE')])
        s = node(nid + 3, 'SaveImage', [1570, y], [320, 200], ['paralation/' + name],
                 n_in=[('images', 'IMAGE')])
        connect(clip, 0, p, 0, 'CLIP')
        connect(aura, 0, k, 0, 'MODEL')
        connect(p, 0, k, 1, 'CONDITIONING')
        connect(zero, 0, k, 2, 'CONDITIONING')
        connect(lats[sz], 0, k, 3, 'LATENT')
        connect(k, 0, d, 0, 'LATENT')
        connect(vae, 0, d, 1, 'VAE')
        connect(d, 0, s, 0, 'IMAGE')
        nid += 4

    return {
        'last_node_id': nid - 1, 'last_link_id': lid[0],
        'nodes': nodes, 'links': links,
        'groups': [], 'config': {}, 'extra': {}, 'version': 0.4,
    }


def build_api(items):
    p = {
        '1': {'class_type': 'UNETLoader', 'inputs': {'unet_name': UNET, 'weight_dtype': 'default'}},
        '2': {'class_type': 'ModelSamplingAuraFlow', 'inputs': {'model': ['1', 0], 'shift': 3}},
        '3': {'class_type': 'CLIPLoader', 'inputs': {'clip_name': CLIP, 'type': 'lumina2', 'device': 'default'}},
        '4': {'class_type': 'VAELoader', 'inputs': {'vae_name': VAE}},
        '6': {'class_type': 'CLIPTextEncode', 'inputs': {'clip': ['3', 0], 'text': ''}},
        '7': {'class_type': 'ConditioningZeroOut', 'inputs': {'conditioning': ['6', 0]}},
    }
    lats, lat_ids = {}, ['5', '8', '9']
    for i, sz in enumerate(sorted({unpack(it)[3] for it in items})):
        lats[sz] = lat_ids[i]
        p[lat_ids[i]] = {'class_type': 'EmptySD3LatentImage',
                         'inputs': {'width': sz[0], 'height': sz[1], 'batch_size': 1}}
    nid = 30
    for i, item in enumerate(items):
        name, text, view, sz = unpack(item)
        pid, kid, did, sid = str(nid), str(nid + 1), str(nid + 2), str(nid + 3)
        p[pid] = {'class_type': 'CLIPTextEncode', 'inputs': {'clip': ['3', 0], 'text': full_prompt(text, view)}}
        p[kid] = {'class_type': 'KSampler', 'inputs': {
            'model': ['2', 0], 'positive': [pid, 0], 'negative': ['7', 0],
            'latent_image': [lats[sz], 0], 'seed': 987650 + i, 'steps': 8, 'cfg': 1,
            'sampler_name': 'res_multistep', 'scheduler': 'simple', 'denoise': 1}}
        p[did] = {'class_type': 'VAEDecode', 'inputs': {'samples': [kid, 0], 'vae': ['4', 0]}}
        p[sid] = {'class_type': 'SaveImage', 'inputs': {'images': [did, 0], 'filename_prefix': 'paralation/' + name}}
        nid += 4
    return {'prompt': p}


def main():
    for wfname, items in WORKFLOWS.items():
        ui = build_ui(items)
        with open(os.path.join(HERE, wfname + '.json'), 'w') as f:
            json.dump(ui, f, indent=1)
        with open(os.path.join(HERE, wfname + '.api.json'), 'w') as f:
            json.dump(build_api(items), f, indent=1)
        if os.path.isdir(LIBRARY):
            with open(os.path.join(LIBRARY, wfname + '.json'), 'w') as f:
                json.dump(ui, f, indent=1)
        print('%s: %d chains, %d nodes' % (wfname, len(items), len(ui['nodes'])))
    print('installed into ' + LIBRARY)


if __name__ == '__main__':
    main()
