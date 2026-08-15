# Images

(Tim's section, above the line.)

---

## Claude's working notes

Hi-res (32px per tile) PNG sprite overrides. The game loads `<objectName>.png` for every object type at boot; any file present replaces the code-drawn version of that sprite, anything missing falls back silently. Files are produced by `..\comfy\import_asset.py`, do not hand-edit sizes (each must be exactly 2x the code-art size in sprites.js).

Current contents are the SECOND art pass (Aug 15 2026, imported from the 2:44 to 4:13 PM ComfyUI run). The first draft is parked in `..\images-v1-backup\`; copy a file back over the same name here to roll one piece back, no code change needed.
