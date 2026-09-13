# Memories in the house

Approach a blue photo marker or amber video marker and press E to relive a moment, or press M to open the memory list. Symbols distinguish the types as well as color. Photos and videos float over a blurred house with softly faded edges. Albums advance after each photo has loaded and been shown for two seconds; videos start automatically and advance when finished. Space pauses, left/right arrows change slides, and Esc immediately returns to wandering. Playback pauses the day and quiets game audio, including the turntable. The date and description appear beneath the media. Unknown dates stay blank.

In Pause, choose a year or an inclusive custom date range and whether to include undated memories. The filter applies to both markers and the memory list and is restored when continuing a saved game. Starting a new game resets the day and filter, preserving stored memories.

## Current test placements

| Memory | Trigger | Visual evidence |
| --- | --- | --- |
| An afternoon in the living room | Clear floor east of the brown coffee table, plan point (507,620) | Orange sofas, coffee table and stair landing identify the room. |
| Laughter at the dining table | Far side of the table, (493,846) | Table, pendants and living room identify the direction. |
| A playful moment in the hallway | Raised walkway alongside the wine cellar, (632,583) | Cabinets and cellar glazing identify the passage. The camera moves, so this is the main viewing area. |
| A birthday around the table | Living-room end of the dining table, clear of chairs, (493,759) | Pendant lights and dining-wall artwork identify the room. |

Positions are visual estimates in the plan coordinate system, not recovered camera calibration. They contain no address or GPS location. Triggers require proximity (about 1.25 m) and matching floor elevation. Tests check walking clearance.

## Memory studio

Open [the memory studio](https://athome.marktan.ai/admin) or use Memory studio in the game's help/settings. Select a memory to edit its title, date, description and location. The local editor works without a cloud connection and saves metadata in IndexedDB. Local files and edits belong to that browser and site origin; keep the originals.

Choose **Add a memory**, then drop photos or a video into the upload area, or use the file picker. Up to 30 items can belong to one memory. A preview strip appears before saving. Select an existing memory and use **Add photos** to append photos without replacing its original media. Save changes to retain the additions.

Click the floor plan or drag its pin to choose where the memory is triggered. The plan shows furniture footprints from the game's collision geometry. Placement moves to reachable floor space in the same room, at least 45 cm clear of furniture and 22 cm clear of walls. If no nearby valid position exists, the last valid pin is retained. The rings show clearance and the approximately 1.25 m trigger radius. **View a room** zooms the plan; **Focus on pin** zooms to the selected location. With the plan focused, arrow keys move the pin 20 cm; Shift moves it 1 m. Floor heights follow the actual game, including stairs. The prebuild step regenerates the furniture and reachability snapshot when geometry changes.

On Vercel, sign in using the project's editor password. Add a JPG, PNG, WebP, MP4, WebM or MOV up to 250 MB. MP4 is the most broadly supported video format; MOV support depends on its codec. Uploads go directly to private Blob storage using a short-lived, authenticated upload token. New uploads are private drafts. Existing local memories can be copied as private drafts.

**Saved memories** lists cloud drafts, published memories and files saved on this device. Search by title, description or date, or filter by status. Select an item to preview it and edit its story or floor-plan position. **Refresh library** reloads cloud changes from other devices.

**Delete memory** asks for confirmation. Deleting a cloud memory removes both its stored media and metadata, and revokes access in the game. Deleting a device memory removes its browser copy and edits; bundled test memories are hidden on that device. Original source files and separately uploaded copies are unaffected. If a cloud deletion is interrupted, the memory stays hidden and is marked **Deletion incomplete** in the editor; select it and retry deletion. A stale browser tab cannot overwrite or delete a newer edit.

**Show this memory in the game** explicitly publishes a memory: anyone able to open the game can then play it. Clearing that checkbox removes public access. A private draft is visible only in the authenticated editor, not in the public catalog or media endpoint. Personal media is never sent to the voice agent.

## Deployment configuration

Connect a **private** Blob store to the At Home Vercel project and enable its read-write token. Vercel supplies `BLOB_READ_WRITE_TOKEN`. Set a separate `MEMORY_ADMIN_PASSWORD` with at least 6 characters for each environment where editing is required, then redeploy. Neither value is public or uses a `VITE_` prefix. Password changes invalidate existing editor sessions.

`api/memory-upload.js` authorizes uploads with constrained paths, content types and file sizes. `api/memories.js` manages metadata and proxies private media, including video range requests. Editor sessions last eight hours in HttpOnly, SameSite=Strict cookies, secure on Vercel. Updates use Blob ETags to reject conflicting edits. Login retry throttling is per function instance, not a shared global rate limiter.

Media is stored under `media/{memory-uuid}/`; metadata is stored at `records/{uuid}.json`. Albums retain an ordered list of media paths and accept additional owner-bound paths. Legacy single-file records remain supported. Deletion removes every file belonging to the album. No separate KV service is required for this small catalog. The API reads metadata from Blob without cache and checks publication state for every media request. Published URLs are application URLs, never raw private-store paths.

The plain Vite server does not run Vercel API functions. Local editing remains available there. Test the cloud editor on the Vercel deployment.

## Source privacy

`public/memories/catalog.json` is an explicit static public allowlist and starts empty. Development may load `local-catalog.json`; original test media and this local catalog are ignored by Git and Vercel, and pruned from production builds. Do not commit private media or the source house drawings. Only deliberately published cloud records appear to game visitors.
