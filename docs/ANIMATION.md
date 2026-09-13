# Gentle character performances

Six new fictional characters were prepared as full-body images and animated using the local ComfyUI MiniMax H3 reference pipeline. No hosted MiniMax API was used.

| Asset | Performance | Duration |
| --- | --- | --- |
| `ken.mp4` | A small friendly wave and smile | 5.17 seconds |
| `nia.mp4` | Soft blink and nod | 5.17 seconds |
| `june.mp4` | A warm smile and subtle head movement | 5.17 seconds |
| `sunny.mp4` | A relaxed seated dog with tail movement | 5.17 seconds |
| `pebble.mp4` | Tortoise extends its neck and looks around | 5.17 seconds |
| `miso.mp4` | Subtle cat movement in a short reversible loop | 1.58 seconds |

The H3 jobs used the reference model, first/last frame guides, 32 steps, `res_multistep`, `simple`, denoise 1, 124 frames at 24 fps. Neighbors use 384×768; pets use 768×512. Generated scenery around the neighbors was removed with video matting. The cat generation contained an unusable lighting fade; only the usable opening motion was retained, exposure matched and looped forward/reverse. Clips were reviewed for subject identity, silhouette, background, ground contact and loop continuity.

Prepared stills and clips share framing metadata, so switching to motion keeps feet aligned. They are photographic billboards with grounded shadows, not rigged 3D characters. Clips load only when characters are nearby, remain muted, and pause when away, hidden or motion is disabled. Ordinary room mirrors and balcony glazing reflect the visible characters; there are no triggered apparitions.

Use `src/actors.js` for playback and keying, `src/scene.js` for placement, `src/house-reflections.js` for reflection surfaces. The public clips are in `public/art/motion`; source jobs and intermediate video files stay outside the repository.

The balcony detail pass adds procedural 3D animation, separate from those six MiniMax clips. Four sunbirds circle, rest on branches and take turns at the hanging feeder during daylight (`src/balcony-life.js`). Fictional occupants on nearby balconies walk, wave, drink coffee or stretch (`src/neighborhood.js`). They change balconies only while both the old and new positions are outside the camera's view. Motion settings disable their movement; birds and occupants retire at night. No additional MiniMax generation was used for these small distant figures.
