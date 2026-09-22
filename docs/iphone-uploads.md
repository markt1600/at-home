# iPhone memory uploads

Open **https://athome.marktan.ai/admin/upload** in Safari and sign in with the
existing memory-editor password. The full editor also links to this page.
Select photos/videos, review their prepared sizes, enter a title and optional
date/description, choose a room, and save. New memories default to private drafts;
the owner can explicitly enable showing them in the game. Existing cloud memories
can receive additional photos and videos without replacing their original items,
location, pet association or soundtrack. An optional audio upload adds/replaces
the soundtrack. The full editor supports later floor-plan adjustments and deletion.

## Preparation

- HEIC/HEIF uses native decoding when available, then the existing libheif fallback.
- Photos are oriented and encoded as JPEG, at most 2560 pixels on the long edge
  and 1,000,000 bytes each. Encoding removes embedded GPS metadata. Originals are
  unchanged. Only one item is decoded/prepared at a time.
- MOV/MP4/WebM uses pinned Mediabunny 1.59.0 and browser codecs to create H.264 MP4,
  at most 1280 × 720 (or portrait equivalent), 30 fps, targeting 1.5 Mbit/s video.
  Existing AAC audio is copied; other audio must convert to AAC successfully.
  Rotation is baked into converted frames. Metadata-first fragmented MP4 and
  two-second keyframes allow playback before the full download completes.
- Video output is written to bounded chunks rather than a growing full-file
  ArrayBuffer. Input limit: 1 GB; duration: 20 minutes; stored output: 250 MiB.
- Browser codec support varies. Older browsers can repackage H.264/AAC without
  compression and label that result explicitly. Unsupported conversions stop
  with an actionable message; they never silently drop video/audio or rename HEVC
  as compatible H.264. Use a current Safari for iPhone HEVC clips. Live Photos
  imported as photos become still images; export their motion as video separately.

## Reliability and access

The existing signed HttpOnly cookie, same-origin API, private Blob upload grants,
ETag conflict checks and publication controls are reused. No admin password or
storage token is included in the client. Files use direct multipart uploads;
the memory record is committed after all its files finish. A failed upload retains
prepared files in this tab and skips completed uploads on retry. A lost commit
response is reconciled with the exact saved record, avoiding duplicate memories.
Closing/reloading the page does not preserve the pending queue. The UI warns on
navigation and requests a screen wake lock while busy where supported.

Converters load only on demand in the uploader; the game does not import them.
The upload page uses system fonts, 16 px inputs, large tap targets, safe-area
spacing and normal page scrolling. It does not use the game's viewport lock.

Primary implementation reference: https://mediabunny.dev/guide/converting-media-files
Library source (including its license): https://registry.npmjs.org/mediabunny/-/mediabunny-1.59.0.tgz
An unmodified MPL-2.0 license copy is included at `/licenses/mediabunny.txt`.
