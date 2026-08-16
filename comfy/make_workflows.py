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

# Art direction v2 (locked Aug 16 2026): Ghibli painterly on Flux Dev.
# Chosen by bake-off against 5 styles: Ghibli keyed with 0.00-0.04% backdrop
# leak and perfect single-object discipline where the runner-up (Casual Game
# Art) baked ground slabs and scenery into 2 of 4 probes. See the workability
# sheet in the repo history and ClaudeParalation.md.
CKPT = 'flux1-dev-fp8.safetensors'
LORA = 'Ghibli_style_flux.safetensors'
LORA_STRENGTH = 0.95
GUIDANCE = 3.5
STEPS = 24

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
XWIDE = (1344, 768)  # the school main building; very wide frontage


def full_prompt(item_text, view='front'):
    kind = 'building' if view == 'ext' else 'prop'
    return ('Ghibli style, %s, hand drawn animation %s, %s, '
            'single object centered on plain magenta background, no drop shadow, '
            'warm cozy colors, soft painterly shading, game asset'
            % (item_text, kind, VIEWS[view]))


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
    # ============================================================
    # The village (Tim's brief, Aug 16 2026): British countryside high street.
    # Shop names are deliberate and personal - keep them EXACTLY as written.
    # Flux renders short sign text decently; garbled signs are a re-roll, not
    # a prompt failure. See ClaudeParalation.md for the setting-shift note.
    # ============================================================
    'paralation-6-village': [
        ('pubBell', 'traditional english country pub called THE BELL, cream painted walls, '
                    'black timber beams, hanging sign with a golden bell, chimneys, '
                    'flower baskets', 'ext', WIDE),
        ('pubGoat', 'old stone english village pub called THE GOAT, slate roof, hanging '
                    'sign with a white goat, low windows with warm light', 'ext', WIDE),
        ('shopSM', 'small english village convenience store with sign reading S&M STORES, '
                   'brick front, green awning, produce crates outside', 'ext', WIDE),
        ('shopOther', 'quirky english corner shop with sign reading THE OTHER SHOP, '
                      'faded red awning, cluttered shop window', 'ext', WIDE),
        ('butcher', 'traditional english butchers shop front, red and white striped awning, '
                    'hanging sign with a pig, tiled lower wall', 'ext', WIDE),
        ('indian', 'indian restaurant in an english village terrace, warm red and gold '
                   'painted front, elegant sign, glowing windows, curry house', 'ext', WIDE),
        ('postOffice', 'small english village post office, red POST OFFICE sign, '
                       'brick front, noticeboard in the window', 'ext', WIDE),
        ('changingRooms', 'small brick sports changing room pavilion, two doors, low roof',
         'ext', WIDE),
        ('socialClub', 'english sports and social club, single storey clubhouse, '
                       'pitched roof, sign reading SPORTS & SOCIAL', 'ext', WIDE),
    ],
    'paralation-7-parks': [
        ('swings', 'playground swing set with two swings, green metal frame', 'front'),
        ('seesaw', 'playground see-saw, red metal with two seats', 'front'),
        ('roundabout', 'playground roundabout merry-go-round, low round platform with '
                       'metal handles', 'front'),
        ('goalFootball', 'white football goal with net', 'front'),
        ('benchP', 'wooden park bench with cast iron ends', 'front'),
        ('planter', 'stone flower planter overflowing with colourful flowers', 'front'),
        ('pillarBox', 'red british royal mail pillar box', 'front', TALL),
        ('signV', 'wooden village fingerpost sign with three pointing arms', 'front', TALL),
        ('binV', 'black cast iron village litter bin with gold trim', 'front'),
        ('posterCat', 'hand drawn MISSING CAT poster on paper, sad cat face, '
                      'pinned to a board', 'front'),
        ('flyerTrip', 'school trip flyer pinned to a noticeboard, forest photo, '
                      'bold heading', 'front'),
    ],
    'paralation-8-school': [
        ('schoolMain', 'british secondary school main building, victorian red brick, '
                       'tall arched windows, clock over the entrance, slate roof',
         'ext', XWIDE),
        ('schoolGym', 'school sports hall, brick and metal siding, high windows, '
                      'double doors', 'ext', WIDE),
        ('schoolGate', 'school entrance gates, wrought iron between brick piers, '
                       'small sign board', 'front', WIDE),
        ('flagpole', 'tall white flagpole with a flag', 'front', TALL),
        ('busCoach', 'small white school minibus coach with blue stripe, side view',
         'front', WIDE),
        ('bikeShed', 'covered school bicycle shelter with a few bikes inside', 'front', WIDE),
        ('standSmall', 'small metal spectator stand with three bench rows and a canopy',
         'front', WIDE),
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

    ckpt = node(1, 'CheckpointLoaderSimple', [40, 80], [340, 100], [CKPT],
                n_out=[('MODEL', 'MODEL'), ('CLIP', 'CLIP'), ('VAE', 'VAE')])
    lora = node(2, 'LoraLoader', [40, 240], [340, 126],
                [LORA, LORA_STRENGTH, LORA_STRENGTH],
                n_in=[('model', 'MODEL'), ('clip', 'CLIP')],
                n_out=[('MODEL', 'MODEL'), ('CLIP', 'CLIP')])
    connect(ckpt, 0, lora, 0, 'MODEL')
    connect(ckpt, 1, lora, 1, 'CLIP')
    # one latent node per distinct shape, shared by every chain that wants it
    lats, lat_ids = {}, [5, 8, 9]
    for i, sz in enumerate(sorted({unpack(it)[3] for it in items})):
        lats[sz] = node(lat_ids[i], 'EmptySD3LatentImage', [40, 430 + i * 130],
                        [340, 106], [sz[0], sz[1], 1], n_out=[('LATENT', 'LATENT')])

    nid = 30
    for i, item in enumerate(items):
        name, text, view, sz = unpack(item)
        y = 60 + i * 240
        p = node(nid, 'CLIPTextEncode', [480, y], [400, 170], [full_prompt(text, view)],
                 n_in=[('clip', 'CLIP')], n_out=[('CONDITIONING', 'CONDITIONING')])
        fg = node(nid + 1, 'FluxGuidance', [910, y], [220, 60], [GUIDANCE],
                  n_in=[('conditioning', 'CONDITIONING')],
                  n_out=[('CONDITIONING', 'CONDITIONING')])
        k = node(nid + 2, 'KSampler', [1160, y], [315, 262],
                 [123450 + i, 'randomize', STEPS, 1, 'euler', 'simple', 1],
                 n_in=[('model', 'MODEL'), ('positive', 'CONDITIONING'),
                       ('negative', 'CONDITIONING'), ('latent_image', 'LATENT')],
                 n_out=[('LATENT', 'LATENT')])
        d = node(nid + 3, 'VAEDecode', [1510, y], [210, 46], [],
                 n_in=[('samples', 'LATENT'), ('vae', 'VAE')],
                 n_out=[('IMAGE', 'IMAGE')])
        s = node(nid + 4, 'SaveImage', [1760, y], [320, 200], ['paralation/' + name],
                 n_in=[('images', 'IMAGE')])
        connect(lora, 1, p, 0, 'CLIP')
        connect(p, 0, fg, 0, 'CONDITIONING')
        connect(lora, 0, k, 0, 'MODEL')
        connect(fg, 0, k, 1, 'CONDITIONING')
        connect(fg, 0, k, 2, 'CONDITIONING')
        connect(lats[sz], 0, k, 3, 'LATENT')
        connect(k, 0, d, 0, 'LATENT')
        connect(ckpt, 2, d, 1, 'VAE')
        connect(d, 0, s, 0, 'IMAGE')
        nid += 5

    return {
        'last_node_id': nid - 1, 'last_link_id': lid[0],
        'nodes': nodes, 'links': links,
        'groups': [], 'config': {}, 'extra': {}, 'version': 0.4,
    }


def build_api(items):
    p = {
        '1': {'class_type': 'CheckpointLoaderSimple', 'inputs': {'ckpt_name': CKPT}},
        '2': {'class_type': 'LoraLoader', 'inputs': {
            'model': ['1', 0], 'clip': ['1', 1], 'lora_name': LORA,
            'strength_model': LORA_STRENGTH, 'strength_clip': LORA_STRENGTH}},
    }
    lats, lat_ids = {}, ['5', '8', '9']
    for i, sz in enumerate(sorted({unpack(it)[3] for it in items})):
        lats[sz] = lat_ids[i]
        p[lat_ids[i]] = {'class_type': 'EmptySD3LatentImage',
                         'inputs': {'width': sz[0], 'height': sz[1], 'batch_size': 1}}
    nid = 30
    for i, item in enumerate(items):
        name, text, view, sz = unpack(item)
        pid, fid, kid, did, sid = (str(nid), str(nid + 1), str(nid + 2),
                                   str(nid + 3), str(nid + 4))
        p[pid] = {'class_type': 'CLIPTextEncode', 'inputs': {'clip': ['2', 1], 'text': full_prompt(text, view)}}
        p[fid] = {'class_type': 'FluxGuidance', 'inputs': {'conditioning': [pid, 0], 'guidance': GUIDANCE}}
        p[kid] = {'class_type': 'KSampler', 'inputs': {
            'model': ['2', 0], 'positive': [fid, 0], 'negative': [fid, 0],
            'latent_image': [lats[sz], 0], 'seed': 987650 + i, 'steps': STEPS, 'cfg': 1,
            'sampler_name': 'euler', 'scheduler': 'simple', 'denoise': 1}}
        p[did] = {'class_type': 'VAEDecode', 'inputs': {'samples': [kid, 0], 'vae': ['1', 2]}}
        p[sid] = {'class_type': 'SaveImage', 'inputs': {'images': [did, 0], 'filename_prefix': 'paralation/' + name}}
        nid += 5
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
