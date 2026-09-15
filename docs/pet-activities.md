# Pet activities and fetch

Leo occasionally finds his bone and chews it. Cyrus alternates roaming and sleep
with grooming and an upright, belly-out rest beside a solid wall, clear of doors.
Each activity has a front and overhead MiniMax H3 clip and a matching still image.
The optional clips load after the essential views without blocking Start.

Approach the bone and click, press E, or tap its prompt to throw it into clear
floor space. Leo chases it, carries it back, and drops it near the player's feet.
He follows if the player moves while waiting. The bone's floor position is saved
with the game; Continue restores it even if the browser closed during a fetch.
New games start with a bone near Leo's home position.

## Generation and review

The six accepted local MiniMax H3 image-to-video jobs and their complete prompts
are in `pet-activity-generation.json`. Each uses the same first and last reference
frame, 124 frames at 24 fps, 32 steps, res_multistep/simple, denoise 1. The activity
videos are 512 pixels wide, H.264 with fast-start metadata, no audio, and together
use about 0.8 MB. Matching WebP first frames cover decoder startup.

Reviewed all six clips for identity, whole-body framing, action, loop endpoints,
and floor contact. Rejected takes with clipped paws/tails and changing backdrops.
Leo's accepted front clip has its flat backdrop normalized and green spill
removed. In-house checks cover front/overhead switching and Cyrus's wall clearance.
These remain pre-rendered views, so viewpoint transitions are discrete.

Validation: 144 regression tests, production build, desktop/mobile interaction,
complete throw/chase/return/drop, moving-player return, save/reload/Continue, and
matching poster display before video decoding.
