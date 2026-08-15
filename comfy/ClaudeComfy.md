# Comfy

(Tim's section, above the line.)

---

## Claude's working notes

ComfyUI asset generation kit for the 32px furniture upgrade.
- paralation-furniture.json: also installed into Comfy Desktop's workflow library (E:\Comfy-Desktop\ComfyUI\ComfyUI\user\default\workflows\), so it appears in the Workflows sidebar. Graph is the official Z Image Turbo layout: UNETLoader(z_image_turbo_bf16) + CLIPLoader(qwen_3_4b_fp8_mixed, lumina2) + ModelSamplingAuraFlow(3) + KSampler(8 steps, cfg 1, res_multistep) + VAELoader(z_image_ae), negative via ConditioningZeroOut. Verified by running a live generation through the API.
- PROMPTS.md: the full shot list and run instructions.
- import_asset.py: converts raw outputs (1024px, plain background) into game-ready sprites in ../images/. Needs Pillow. It corner-samples the background color and flood-fills inward from the border, so it does not care whether the background comes out magenta, white or pink; it only breaks when the OBJECT is close in color to the background.
- workflow-backup-preRugFix/: copies of the four Comfy Desktop workflow JSONs as they stood before the Aug 15 rug-prompt fix. Kept outside the Comfy workflows folder on purpose, so it does not show up as a subfolder in the Workflows sidebar.
Raw generations land in E:\Comfy-Desktop\ComfyUI-Shared\output\paralation\ via the SaveImage filename_prefix.

PROMPT RULE learned the hard way (Aug 15 2026): never name a pink, salmon or magenta object. Backgrounds render pink regardless of the "plain magenta background" instruction, so a pink object cannot be keyed out from it. The rug burned 19 candidates this way before the prompt was changed to navy and cream.
NOTE: Tim's ComfyUI is now Comfy Desktop (E:\Comfy-Desktop). The old E:\Comfy2 install from the comfyui-expert skill notes is GONE, and its LoRA library (pixel_art_style etc.) did not migrate. Always verify models via the API (http://127.0.0.1:8188/object_info) before designing workflows.
