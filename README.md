# LAST BELL

An original first-person paranoia horror game set in **Bukit Senja Night Institute**, a fictional adult-education campus in Singapore. Built for the `markt1600/human` repository and static hosting on Vercel.

This is a complete, playable **indie prototype**, not a recreation of another game's art, dialogue, characters, or code. It uses real-time, stylized 3D graphics rather than photorealistic production assets. All students and staff are fictional adults, aged 21–57.

## Play

You are a night security officer holding classroom 04–07 until morning. Twelve people arrive across three watches. Decide whom to admit, reject, or shoot. Their identities change each run.

- Procedural 3D school: open-air corridor, HDB silhouettes, rain, desks, wire door, records cabinet, radio, noticeboard, lighting, bloom, fog, shadows.
- Seeded encounter order and visitor assignments. Temperature, pulse, UV residue and testimony provide uncertain evidence with false positives.
- First-person weapon with aim, recoil, muzzle flash, audio report, blood particles and impact pools. Blood and camera movement can be disabled.
- Ammunition, noise, resolve, shelter and trust tracking. Infiltration and gunfire have consequences between watches.
- Six endings and a post-game identity ledger.
- A discoverable document puzzle and alternate relay-shutdown ending.
- Local autosave/resume, subtitles, keyboard controls, click-based alternatives, responsive UI, volume and optional browser speech.
- Optional ElevenLabs live voice intercom, loaded only on connection. The game works without an account, microphone, backend, or paid API.

## Run locally

Node.js 20.19+ (or 22.12+) is recommended.

```sh
npm ci
npm run dev
```

```sh
npm test
npm run build
npm run preview
```

## Deploy to Vercel

1. Import **markt1600/human** into Vercel.
2. Choose the **Vite** preset. Root directory: repository root.
3. Build command: `npm run build`. Output directory: `dist`.
4. Deploy. No environment variables are required for the core game.

`vercel.json` contains these settings. This is a client-side static game; it does not need server functions or a database. Vercel provides the HTTPS needed for optional microphone access.

For the optional intercom, see [ElevenLabs setup](docs/ELEVENLABS.md). Never put an ElevenLabs API key in a `VITE_` variable or in the browser.

## Controls

| Control | Action |
| --- | --- |
| Click the 3D scene | Capture mouse for first-person look |
| WASD | Walk around the classroom |
| Right mouse + left mouse | Aim and fire at the person outside |
| 1 / 2 / 3 | Temperature / pulse / UV scan |
| E | Interact with the object under the crosshair |
| Escape | Pause / release mouse |
| On-screen buttons | Questions, scans, decisions, room locations, settings |

On narrow displays, the interface stacks vertically and all core actions remain available through buttons. A keyboard and mouse are recommended for first-person movement. The game requires WebGL 2 and graphics acceleration.

## Architecture

- `src/game.js`: deterministic state transitions and persistence.
- `src/content.js`: original adult cast, documents, ending narratives.
- `src/scene.js`: Three.js environment, character and weapon geometry, movement, lighting and impacts.
- `src/main.js`: game interface, input, timers and narrative flow.
- `src/audio.js`: Web Audio synthesis and optional browser speech.
- `src/voice.js`: lazy ElevenLabs connection, transcript, mute and disconnect.
- `tests/game.test.js`: randomized-run, state-transition, puzzle, ending and persistence tests.

Progress is stored only in the player's browser. Clearing browser data clears it. Voice transcripts are kept only in memory by this app; ElevenLabs may retain conversations according to the configured agent's account settings. Closing the intercom panel does not end a connection: use **Disconnect**. Leaving the game ends it; hiding the tab mutes its microphone.

## Visual and audio scope

All meshes, effects and text are authored for this project. Environmental sounds are synthesized locally. Optional spoken dialogue uses installed browser voices; it is not generated ElevenLabs narration. No Minimax video or pre-rendered cinematic is included. The optional ElevenLabs agent requires your own configuration and has not been live-tested without an agent ID.

Fonts: Barlow Condensed, DM Sans and IBM Plex Mono via Google Fonts, with local fallbacks. Three.js and ElevenLabs dependencies retain their upstream licenses. The repository does not grant a separate license for the original game content.
