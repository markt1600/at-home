# Turntable music

Open [the music library](https://athome.marktan.ai/admin#music-studio) and sign in using the same editor password as memories. Drop audio files onto the music upload area or choose files, then upload. Supported extensions are MP3, M4A, AAC, WAV, Ogg/OGA, Opus, FLAC and WebM/WEBA. Each file can be up to 100 MB; upload up to 30 at a time. Playback depends on the browser's codec support; MP3 and AAC in M4A are suitable for broad compatibility.

Uploaded tracks are enabled for game visitors. Each track has a title, preview player, visibility checkbox and delete action. Saving a disabled track removes it from the public playlist and denies public access to its audio. Delete asks for confirmation and removes both media and metadata. Keep original files as a backup.

Walk up to the vinyl turntable and press E to start or stop music. Enabled tracks play alphabetically by title, one after another, then repeat. The record spins at 33⅓ rpm during actual playback and stops when audio is paused, buffering or stopped. Memories suspend the music and return to its current position afterward. Before music is uploaded, the turntable plays the game's gentle synthesized melody.

Music uses the existing private Vercel Blob store and editor authentication. No additional environment variables or KV store are needed. `api/music-upload.js` issues constrained upload tokens; `api/music.js` serves the playlist, authenticated edits, deletion and range-capable audio streams. Files use `music/{uuid}.{extension}` and metadata uses `music-records/{uuid}.json`. Raw private storage paths are not exposed in the public playlist. Metadata updates use ETags to reject stale edits; interrupted deletions stay hidden until retried.

The plain Vite development server does not run the storage functions. Use the deployed editor for uploads.
