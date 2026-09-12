# Character motion and reflections

The game includes fourteen locally generated MiniMax H3 clips: one idle for each of the twelve fictional adult visitors, a raised-hand gesture for Farah and a longer head tilt for Mei. The original photographic full-body assets supplied each character's appearance. No household photos or identifying household information are embedded in these clips.

The clips use breathing, blinking, small changes in gaze, head turns and brief smiles. They run at 384 × 768, 24 fps, for 124 frames each, with matching first and last poses. All were sampled at 32 steps in the installed ComfyUI workflow, visually reviewed and exported as silent H.264 MP4 files with fast-start metadata. Speech remains an ElevenLabs responsibility.

## In the house

- Visitors at the door and admitted residents use their own idle animations.
- Four mirrors and seven fixed window/balcony glass panels reflect the room.
- Approaching a visible reflective surface can reveal an animated figure. Figures fade in and out over about five seconds, with a shared 38–66 second cooldown and a maximum of fourteen sightings per run.
- Reflection-specific voice cues fire when a figure actually appears. These fleeting apparitions do not imply that an admitted resident moved or reveal any visitor's hidden identity.
- Balcony reflections occupy the fixed side panels, leaving the open central passage clear. Geometry in front of the glass, including its frames, occludes the figure.

## Rendering and controls

`src/visitor-video.js` keys the flat magenta background in the video shader, preserves foot position as the still image becomes animated and uses the current frame's silhouette for shot detection. If playback fails, the original portrait remains available. Falling visitors still transition to the existing textured 3D corpse geometry.

Videos load on demand and pause with the game, when the tab is hidden, and for distant admitted residents. Disabling motion switches characters to still portraits. Reflection scares remain visible as still figures with a fade. At most two room-reflection textures refresh per frame; other panes reuse their previous frame to bound rendering cost.

Standing characters remain photographic planes, not freely rotatable rigged 3D humans. The generated movement improves their facial and body performance within that presentation. Reflections use 512-pixel render targets. See `public/art/motion/manifest.json` for asset dimensions, duration, model and sampling provenance.
