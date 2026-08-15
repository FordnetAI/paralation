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

FRONT = ('front view seen from the front and slightly above like Stardew Valley '
         'interior furniture, flat 2D, no perspective')
TOP = 'viewed directly from above, flat top-down'


def full_prompt(item_text, topdown=False):
    return ('pixel art %s, 32-bit SNES style RPG furniture sprite, %s, '
            'single object centered on plain magenta background, no drop shadow, '
            'warm cozy colors, soft top-left lighting, clean dark outline, '
            'detailed shading, game asset' % (item_text, TOP if topdown else FRONT))


# (assetName, item text, topdown)
WORKFLOWS = {
    'paralation-1-bedroom': [
        ('bed', "teenager's single bed with green blanket and white pillow, wooden headboard", False),
        ('bedDouble', 'double bed with two pillows and dusty rose blanket, wooden headboard', False),
        ('nightstand', 'small wooden nightstand with an orange prescription pill bottle on top', False),
        ('bookshelf', 'tall wooden bookshelf full of colorful books and comics', False),
        ('desk', 'wooden computer desk with monitor, keyboard, red mug and eyeglasses on it', False),
        ('chair', 'simple wooden chair', False),
        ('backpack', 'red school backpack sitting on the floor', False),
        ('dresser', 'wide low wooden dresser with two drawers and round knobs', False),
        ('poster', 'retro space rocket poster with dark blue background', False),
        ('mirrorW', 'gold framed wall mirror', False),
    ],
    'paralation-2-living': [
        ('couch', 'warm brown leather couch with two seat cushions and rolled arms', False),
        ('tvStand', 'low wooden TV stand with a flat screen television on top', False),
        ('coffeeT', 'low wooden coffee table with a blue puzzle box on it', False),
        ('hallTable', 'narrow wooden hall table with a blue flower vase and letters on it', False),
        ('plant', 'monstera houseplant in a terracotta pot', False),
        ('tableD', 'wooden dining table with a fruit bowl in the center', False),
        ('photoW', 'small framed photo of a family at the beach', False),
        ('doorF', 'wooden four-panel front door with brass knob', False),
        ('windowW', 'white framed window showing blue sky and clouds', False),
        # Do NOT give this one a pink/salmon color: the background is pink, so a
        # pink rug leaves the importer's corner-key nothing to separate. Every
        # one of the 19 salmon-pink candidates was unusable. Contrast is the fix.
        ('rug', 'rectangular navy blue and cream braided area rug with a simple '
                'border pattern', True),
    ],
    'paralation-3-kitchen-bath': [
        ('counter', 'kitchen base cabinet with light stone countertop', False),
        ('counterSink', 'kitchen counter with steel sink basin and faucet', False),
        ('counterNote', 'kitchen counter with a small handwritten note lying on top', False),
        ('stove', 'white kitchen stove with black burners and oven window', False),
        ('fridge', 'white refrigerator with door handles and fridge magnets', False),
        ('toilet', 'white porcelain toilet with tank', False),
        ('sinkP', 'white pedestal bathroom sink', False),
        ('tub', 'white bathtub filled with blue water', False),
        ('rug2', 'large area rug, cream center with burgundy border pattern', True),
        ('mat', 'small brown rectangular doormat with woven texture', True),
    ],
}


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
    lat = node(5, 'EmptySD3LatentImage', [40, 590], [340, 106], [1024, 1024, 1],
               n_out=[('LATENT', 'LATENT')])
    neg = node(6, 'CLIPTextEncode', [40, 750], [340, 96], [''],
               n_in=[('clip', 'CLIP')], n_out=[('CONDITIONING', 'CONDITIONING')])
    zero = node(7, 'ConditioningZeroOut', [40, 900], [340, 46], [],
                n_in=[('conditioning', 'CONDITIONING')],
                n_out=[('CONDITIONING', 'CONDITIONING')])
    connect(unet, 0, aura, 0, 'MODEL')
    connect(clip, 0, neg, 0, 'CLIP')
    connect(neg, 0, zero, 0, 'CONDITIONING')

    nid = 10
    for i, (name, text, topdown) in enumerate(items):
        y = 60 + i * 240
        p = node(nid, 'CLIPTextEncode', [480, y], [430, 170], [full_prompt(text, topdown)],
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
        connect(lat, 0, k, 3, 'LATENT')
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
        '5': {'class_type': 'EmptySD3LatentImage', 'inputs': {'width': 1024, 'height': 1024, 'batch_size': 1}},
        '6': {'class_type': 'CLIPTextEncode', 'inputs': {'clip': ['3', 0], 'text': ''}},
        '7': {'class_type': 'ConditioningZeroOut', 'inputs': {'conditioning': ['6', 0]}},
    }
    nid = 10
    for i, (name, text, topdown) in enumerate(items):
        pid, kid, did, sid = str(nid), str(nid + 1), str(nid + 2), str(nid + 3)
        p[pid] = {'class_type': 'CLIPTextEncode', 'inputs': {'clip': ['3', 0], 'text': full_prompt(text, topdown)}}
        p[kid] = {'class_type': 'KSampler', 'inputs': {
            'model': ['2', 0], 'positive': [pid, 0], 'negative': ['7', 0],
            'latent_image': ['5', 0], 'seed': 987650 + i, 'steps': 8, 'cfg': 1,
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
