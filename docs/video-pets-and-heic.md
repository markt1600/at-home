# Video pet views and iPhone photos

Pets now use pre-rendered video at every viewing angle. Close overhead views use dedicated top-down MiniMax H3 clips for walking and resting; the polygon models have been removed. The last decoded angle remains visible while another is preparing. Matching still frames cover initial video loading, and the renderer uploads the first decoded frame even when an idle pet pauses immediately.

The original fourteen pet videos have been compressed from 9.81 MB to 2.44 MB in total. Six new overhead clips add approximately 0.62 MB. All pet videos are downloaded before entering the house and reused through local object URLs. Front/side/rear views remain camera-facing pre-rendered images; overhead views follow the pet's travel direction. These provide different photographed viewpoints, not a fully volumetric 3D animal.

HEIC/HEIF files can be selected or dropped into a new memory or appended to an existing slideshow. Photos are converted on the device to JPEG, limited to a 2560-pixel long edge, then use the same local or private cloud upload flow as other photos. The original source file is unchanged. Unsupported or damaged files report a conversion error without altering the saved memory. The decoder is loaded only when needed; it adds no initial game download. Library notices are in `public/licenses/`.

Other changes in this update: floor-level wall and glass caps no longer overlap doorway and wine-cellar floor surfaces; pets avoid resting in narrow door thresholds; Escape resumes wandering from pause and memory screens. Nearby keyboard/touch controls now operate the lift call button, kitchen fridge, bathroom and kitchen taps, showers and bath fill/drain. These fixture states last for the current visit.

Each visit now shows up to eight randomly selected floor memories from the chosen date range. Continue, New Game, changing dates or choosing “Discover another selection” in Pause draws a fresh set. Opening a memory, returning from Pause or refreshing unchanged library data keeps the same spots. Pet albums remain attached to pets outside this quota, and the library/editor retains the full collection. Date filtering still applies to pet albums.

The accepted video prompts and generation settings are in `pet-overhead-generation.json`; image guide prompts used with the built-in image generation tool are in `pet-overhead-images.json`. Guide framing was expanded for Cyrus, Pebble and resting Leo to preserve margins around moving paws and tails. Final video and matching still assets are under `public/art/motion/compact/`.
