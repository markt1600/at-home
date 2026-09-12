# Memories in the house

Approach a muted gold floor marker to reveal a “Relive this moment” prompt. Press E or click it. Memories can also be opened from the Memories panel; “Go to this spot” takes you to their viewing position. The day pauses during playback, and game audio is muted so the original recording can be heard. Images remain open until dismissed.

## Current local test placements

| Memory | Trigger | Evidence / confidence |
| --- | --- | --- |
| An afternoon in the living room | Clear floor beside the orange sofas and coffee table, plan point (493,620) | Sofas, coffee table and stair landing confirm the room. Camera position is approximate. |
| Laughter at the dining table | Far side of the table looking toward the living room, (493,846) | Table, pendant lights and orange sofas confirm the direction. |
| A playful moment in the hallway | Raised walkway alongside the wine cellar, (632,583) | Green cabinets and cellar glazing confirm the passage. The camera moves; this is the main viewing area. |
| A birthday around the table | Living-room end of the dining table, moved to the clear side of the chairs, (493,759) | Pendant lights and dining-wall artwork confirm the room. |

These points use the existing plan coordinate system in `src/house-layout.js`. They do not encode an address or GPS location. Trigger radius is approximately 1.25 m and floor elevation must match. Walkable clearance is covered by tests. These are visual estimates, not recovered camera calibration.

## Add a private memory

Memories → Add a memory from this device accepts JPG, PNG, WebP, MP4, MOV or WebM. Choose the current standing position or a preset spot. Files are saved in this browser's IndexedDB and never uploaded by the game. Browser codec support may vary, especially for MOV. Local memories are specific to the browser and site origin and are not a backup; keep the originals.

## Shared memories

`public/memories/catalog.json` is the explicit public allowlist and starts empty. Entries can use a preset `id` plus `type`, `src` and optional `poster`, or specify `title`, `description`, `plan`, `room` and `view`. Only assets referenced by the public catalog are allowed into a production build. Publishing also requires explicitly allowing the chosen files through `.gitignore` and `.vercelignore`.

During local development, `public/memories/local-catalog.json` can supply the four test memories. The local catalog and personal media are ignored by Git. They are excluded from production builds. The server defaults to localhost only.

No media is sent to the conversational agent. It receives ordinary game context, not personal memory files or identities.
