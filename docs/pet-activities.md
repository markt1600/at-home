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

## Playing together

During the day, Leo and Cyrus occasionally meet on a clear, level patch of floor.
Leo bows and wags while Cyrus answers with gentle paw taps. They follow their
normal navigation paths, face each other, and wait for both current video views
to decode before starting the shared gesture. Two or three loops last roughly
10–15 seconds, followed by independent roaming and a randomized cooldown.

Sleeping, greetings, and fetch take priority. Care or a new game releases both
pets immediately. An obstructed approach, unavailable clip, or player stepping
into their play space ends the attempt safely. Pausing freezes the shared clock.

Eight new local MiniMax H3 clips cover side, front, rear, and overhead views for
both pets. `pet-play-generation.json` records the complete prompts and job IDs.
The 512-pixel H.264 clips and matching WebP posters total 1,452,935 bytes; they
warm after essential assets and do not delay entry. Only the selected view of
each pet plays, and changing angle joins the same point in the shared gesture.
No additional geometry, lights, or polygon fallback is introduced.

Validation for shared play: all 178 regression tests and the production build
passed. Desktop and mobile-emulated browsers decoded both films, preserved
pause/resume, and returned to roaming without errors. Local 3-second samples
measured 59.0 FPS during desktop play versus 60.0 idle, and 59.7 versus 60.0 with
mobile emulation. These are local desktop GPU measurements, not physical-phone
benchmarks. All four viewing directions were checked in the rendered house.

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
