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

**Memory soundtrack** accepts one optional song for a new or existing memory. Drop an audio file there, then save. MP3, M4A/AAC, WAV, Ogg/Opus, FLAC and WebM audio are supported, up to 100 MB, subject to the browser's codecs. The song plays continuously and loops across the slideshow, replacing video audio in mixed albums. Space pauses both the slides and song. Closing restores the previous house volume and resumes any record that was playing from its previous position. Adding more photos preserves the soundtrack. Choose **No soundtrack** and save to remove it.

On Vercel, sign in using the project's editor password. Add JPG, PNG, WebP or HEIC photos (compressed in the browser to 1 MB or less) and MP4, MOV or WebM videos up to 1 GB, which the browser converts to a smaller MP4 (up to 720p and 20 minutes, 250 MB prepared) before uploading; the dropzone shows the conversion progress. MP4 is the most broadly supported video format; MOV support depends on its codec. Uploads go directly to private Blob storage using a short-lived, authenticated upload token. New uploads are private drafts. Existing local memories can be copied as private drafts.

**Saved memories** lists cloud drafts, published memories and files saved on this device. Search by title, description or date, or filter by status. Select an item to preview it and edit its story or floor-plan position. **Refresh library** reloads cloud changes from other devices.

**Delete memory** asks for confirmation. Deleting a cloud memory hides it from the game at once and moves it to **Recently deleted** (in the Show filter), files intact, for 30 days. There, **Restore memory** brings it back as a private draft and **Delete forever** removes its media, originals and story immediately; after 30 days this happens by itself the next time the editor is opened. Deleting a device memory removes its browser copy and edits; bundled test memories are hidden on that device. Original source files and separately uploaded copies are unaffected. If a permanent deletion is interrupted, the memory stays hidden and is marked **Deletion incomplete** in the editor; select it and retry deletion. A stale browser tab cannot overwrite or delete a newer edit.

**Show this memory in the game** explicitly publishes a memory: anyone able to open the game can then play it. Clearing that checkbox removes public access. A private draft is visible only in the authenticated editor, not in the public catalog or media endpoint. Personal media is never sent to the voice agent.

## Keeping memories safe

**Originals.** The house plays reduced copies (photos up to 2560 px and 1 MB, videos up to 720p). With **Also keep the untouched originals** ticked (the default, in both the studio and the phone uploader) the file exactly as it left the phone or camera is stored as well, under `originals/{memory-uuid}/`. Originals are private: they are never part of the slideshow, never listed to game visitors and only downloadable by the signed-in editor (the **Original** link under each item). A photo that needed no reduction is its own original. Memories uploaded before this option have no original in the cloud; keep those source files.

**Download everything** (in **Keep them safe**) saves one `.zip` with a folder per memory: the house copies in order, `originals/`, any soundtrack and a `memory.json` with the story. Chrome and Edge write it straight to disk; other browsers assemble it first, so allow free disk space equal to the library. Files that cannot be fetched are listed inside the archive, never silently skipped. Turntable music is not included.

**Second copy.** Connect a second private Blob store and add its read-write token to the project as `BACKUP_BLOB_READ_WRITE_TOKEN`, plus a `CRON_SECRET` of 16 or more random characters, then redeploy. A daily job (`/api/memory-backup`, 03:17 UTC) copies new and changed files into it and never deletes from it, so a memory removed from the main store by mistake still exists there. The studio shows the last run and has **Update second copy now**. A run copies for up to four minutes; a large first copy finishes over several runs. Restoring is manual: point the project at the backup store, or copy files back.

**Earlier versions.** Each time a memory's title, date, description, pet or position changes, the previous version is kept with it (the last 20). **Earlier versions** in the editor lists them; **Bring back** fills the form, and saving keeps it. Photos and videos are not versioned.

**Dates.** When files are chosen, the date field is filled from the earliest capture date found in them (photo EXIF, or the movie header for MOV/MP4), read before they are re-encoded. If a file carries none, its own modified date is suggested with a note to check it. Only the calendar date is read; location is not.

**Live Photos.** A browser file picker only receives a Live Photo's still. To keep the motion, save the Live Photo as a video in Photos (or export unmodified originals on a Mac) and choose the photo and its clip together: two files with the same name, such as `IMG_1234.HEIC` and `IMG_1234.MOV` (clip under 40 MB), become one slide. In the game the clip plays once, then rests on the photo.

## In the house

- **On this day.** A few seconds after arriving, the game mentions a memory dated today in an earlier year (or within three days of it). The Memories list opens with the same section.
- **Which markers appear.** Each visit still shows up to eight spots, but the draw now favours anniversaries, then memories from this time of year (within about six weeks), and memories not opened recently on this device. Chance decides among equals.
- **Timeline.** The Memories list (M) is grouped by year, newest first, with thumbnails, dates and a row of year buttons.
- **Picture frames.** A frame on the blue dining sideboard, one on the office desk and one on a bedside table show photos from the library: today's anniversaries first, then this visit's memories. Look at a frame and interact to open its memory. Frames are put away when there are no photo memories and while exploring without memories.
- **Cinema.** The screen plays photo memories as slideshows with their soundtrack, as well as videos.

## Deployment configuration

Connect a **private** Blob store to the At Home Vercel project and enable its read-write token. Vercel supplies `BLOB_READ_WRITE_TOKEN`. Set a separate `MEMORY_ADMIN_PASSWORD` with at least 6 characters for each environment where editing is required, then redeploy. Neither value is public or uses a `VITE_` prefix. Password changes invalidate existing editor sessions.

`api/memory-upload.js` authorizes uploads with constrained paths, content types and file sizes. `api/memories.js` manages metadata and proxies private media, including video range requests. Editor sessions last eight hours in HttpOnly, SameSite=Strict cookies, secure on Vercel. Updates use Blob ETags to reject conflicting edits. Login retry throttling is per function instance, not a shared global rate limiter.

Media is stored under `media/{memory-uuid}/`; metadata is stored at `records/{uuid}.json`. Albums retain an ordered list of media paths and accept additional owner-bound paths. Legacy single-file records remain supported. Deletion removes every file belonging to the album. No separate KV service is required. The record files remain the source of truth; `records/_index.json` holds a copy of them all so a load is one listing plus one read however large the library is. The index is compared with the listing's ETags on every load, changed records are re-read and the index rewritten, so it can be deleted at any time. Publication state is still checked against the record itself for every media request. Published URLs are application URLs, never raw private-store paths.

Soundtracks use `soundtracks/{memory-uuid}/{asset-uuid}.{extension}` in the same private store. They inherit the memory's draft/published visibility and are served through the same range-capable media endpoint. Replacing or removing a song deletes the previous audio after the metadata update succeeds; deleting a memory also removes its soundtrack. Device memories keep their songs in IndexedDB until explicitly copied to cloud storage.

The editor stays locked until you sign in: signed out, the page shows only the password form, and every upload control (the dropzones, the library, the music studio and the phone uploader link) appears after the password is accepted. The plain Vite server does not run Vercel API functions, so nothing can be edited there; test the editor on the Vercel deployment.

## Source privacy

`public/memories/catalog.json` is an explicit static public allowlist and starts empty. Development may load `local-catalog.json`; original test media and this local catalog are ignored by Git and Vercel, and pruned from production builds. Do not commit private media or the source house drawings. Only deliberately published cloud records appear to game visitors.
