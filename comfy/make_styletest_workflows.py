"""Generates the style bake-off workflows (Flux Dev + one LoRA per section).

Two workflows, installed into the Comfy Desktop sidebar like the others:
  paralation-styletest-a: LoRAs already on disk. Ready to queue right now.
  paralation-styletest-b: LoRAs Tim downloads from CivitAI by hand (they are
    login-gated). Queue it AFTER the files are in the loras folder with the
    exact names below, or ComfyUI will error on load.

Every LoRA section generates the same four probe assets (bed, houseMatt,
toilet, tree) with FIXED seeds, so sheets compare style and nothing else.
Outputs land in output/paralation-styletest/<tag>_<asset>_*.png; when a run
is done, tell Claude and the comparison sheet gets built from that folder.

Run:  python make_styletest_workflows.py
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
LIBRARY = r'E:\Comfy-Desktop\ComfyUI\ComfyUI\user\default\workflows'

CKPT = 'flux1-dev-fp8.safetensors'
STRENGTH = 0.95
GUIDANCE = 3.5
STEPS = 24

ITEMS = [
    ('bed', "teenager's single bed with green blanket and white pillow, "
            'wooden headboard, front view slightly above'),
    ('houseMatt', 'two story suburban family house, cream stucco, slate grey '
                  'roof, navy front door, front elevation view, no ground beneath'),
    ('toilet', 'white porcelain toilet with tank, front view slightly above'),
    ('tree', 'large leafy oak tree with thick trunk and full green canopy, front view'),
]

# (tag, lora filename, trigger words)
WORKFLOWS = {
    'paralation-styletest-a': [
        ('sbg', 'CasualGameArt_SBG_flux.safetensors', 'SBG_quality, casual game art'),
        ('ghibli', 'Ghibli_style_flux.safetensors', 'Ghibli style'),
        ('clay', 'Clay_Animation_flux.safetensors', 'Clay Animation Style'),
        ('cute3d', 'Cute3DMovie_3DMVIE_flux.safetensors', '3DMVIE'),
    ],
    'paralation-styletest-b': [
        ('oumei', 'CartoonCasualGame_oumeikatong_flux.safetensors', 'oumeikatong1'),
        ('storybook', 'Storybook_Illustration_flux.safetensors', 'Storybook Illustration art style'),
        ('flat', 'Flat_Cartoon_ArsMJ_flux.safetensors', 'ArsMJStyle, Flat Cartoon Illustration'),
        ('90s', '90s_HandDrawn_PIVIG_flux.safetensors', 'PIVIG image style'),
        ('cozy', 'Cozy_Paradise_flux.safetensors', 'cozy illustrated scene'),
        ('2dga', '2D_GameAssets_GRPZA_flux.safetensors', 'GRPZA'),
    ],
}


def prompt_text(trigger, item_text):
    return ('%s, %s, single object centered on plain magenta background, '
            'no drop shadow, game asset' % (trigger, item_text))


def build_ui(loras):
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

    ckpt = node(1, 'CheckpointLoaderSimple', [30, 40], [340, 100], [CKPT],
                n_out=[('MODEL', 'MODEL'), ('CLIP', 'CLIP'), ('VAE', 'VAE')])
    lat = node(2, 'EmptySD3LatentImage', [30, 200], [340, 106], [1024, 1024, 1],
               n_out=[('LATENT', 'LATENT')])

    nid = 10
    for li, (tag, lora, trigger) in enumerate(loras):
        ly = 40 + li * (len(ITEMS) * 240 + 80)
        lo = node(nid, 'LoraLoader', [420, ly], [340, 126],
                  [lora, STRENGTH, STRENGTH],
                  n_in=[('model', 'MODEL'), ('clip', 'CLIP')],
                  n_out=[('MODEL', 'MODEL'), ('CLIP', 'CLIP')])
        connect(ckpt, 0, lo, 0, 'MODEL')
        connect(ckpt, 1, lo, 1, 'CLIP')
        nid += 1
        for i, (name, text) in enumerate(ITEMS):
            y = ly + 60 + i * 240
            p = node(nid, 'CLIPTextEncode', [800, y], [400, 150],
                     [prompt_text(trigger, text)],
                     n_in=[('clip', 'CLIP')], n_out=[('CONDITIONING', 'CONDITIONING')])
            fg = node(nid + 1, 'FluxGuidance', [1230, y], [240, 60], [GUIDANCE],
                      n_in=[('conditioning', 'CONDITIONING')],
                      n_out=[('CONDITIONING', 'CONDITIONING')])
            k = node(nid + 2, 'KSampler', [1500, y], [315, 262],
                     [555200 + i, 'fixed', STEPS, 1, 'euler', 'simple', 1],
                     n_in=[('model', 'MODEL'), ('positive', 'CONDITIONING'),
                           ('negative', 'CONDITIONING'), ('latent_image', 'LATENT')],
                     n_out=[('LATENT', 'LATENT')])
            d = node(nid + 3, 'VAEDecode', [1850, y], [200, 46], [],
                     n_in=[('samples', 'LATENT'), ('vae', 'VAE')],
                     n_out=[('IMAGE', 'IMAGE')])
            s = node(nid + 4, 'SaveImage', [2090, y], [300, 200],
                     ['paralation-styletest/%s_%s' % (tag, name)],
                     n_in=[('images', 'IMAGE')])
            connect(lo, 1, p, 0, 'CLIP')
            connect(p, 0, fg, 0, 'CONDITIONING')
            connect(lo, 0, k, 0, 'MODEL')
            connect(fg, 0, k, 1, 'CONDITIONING')
            connect(fg, 0, k, 2, 'CONDITIONING')
            connect(lat, 0, k, 3, 'LATENT')
            connect(k, 0, d, 0, 'LATENT')
            connect(ckpt, 2, d, 1, 'VAE')
            connect(d, 0, s, 0, 'IMAGE')
            nid += 5

    return {
        'last_node_id': nid - 1, 'last_link_id': lid[0],
        'nodes': nodes, 'links': links,
        'groups': [], 'config': {}, 'extra': {}, 'version': 0.4,
    }


def main():
    for wfname, loras in WORKFLOWS.items():
        ui = build_ui(loras)
        with open(os.path.join(HERE, wfname + '.json'), 'w') as f:
            json.dump(ui, f, indent=1)
        if os.path.isdir(LIBRARY):
            with open(os.path.join(LIBRARY, wfname + '.json'), 'w') as f:
                json.dump(ui, f, indent=1)
        print('%s: %d lora sections, %d nodes' % (wfname, len(loras), len(ui['nodes'])))
    print('installed into ' + LIBRARY)


if __name__ == '__main__':
    main()
