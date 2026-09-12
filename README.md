# LAST BELL

An original first-person paranoia horror game set in a fictionalized home in Singapore, modelled from a supplied walkthrough. Built for the `markt1600/human` repository and Vercel hosting.

This is a complete, playable **indie prototype**, not a recreation of another game's art, dialogue, characters, or code. It combines a real-time 3D house with generated photographic portraits and material textures. All visitors are fictional adults, aged 21–57.

## Play

You are the resident holding the front door until morning. Twelve people arrive across three watches. Decide whom to admit, reject, or shoot. Their identities change each run.

- Walkthrough-based house: entrance hall, study, storage, living room, dining area, kitchen, utility room, window lounge, balcony, bedroom, dressing room and bathroom. Explore before the first watch with no deadline.
- Generated photographic visitor portraits and ivory plaster, sage cabinetry, marble and oak textures, combined with rain, fog, shadows and a working torch.
- Minimal encounter interface: large dialogue and scan results, with Talk / Examine / Decide choices. Clues, records, shelter and documents are in the notebook.
- Seeded encounter order and visitor assignments. Temperature, pulse, UV residue and testimony provide uncertain evidence with false positives.
- First-person weapon with aim, recoil, muzzle flash, audio report, blood particles and impact pools. Blood and camera movement can be disabled.
- Ammunition, noise, resolve, shelter and trust tracking. Infiltration and gunfire have consequences between watches.
- Brief, randomized borrowed faces in the bedroom mirror, with cooldowns and a per-session cap.
- Six endings and a post-game identity ledger.
- A discoverable document puzzle and alternate relay-shutdown ending.
- Player name entry, local autosave/resume, subtitles, keyboard controls, click-based alternatives, responsive UI and visible sound controls. The first interaction unlocks the rain and electrical ambience.
- Occasional personalized house-intercom calls: live ElevenLabs performance when connected, or server-generated ElevenLabs whispers otherwise. No browser text-to-speech. A setting disables name calls.
- Optional ElevenLabs live voice intercom, loaded only on connection. The core game works without voice services; ElevenLabs speech requires the configured account.

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

`vercel.json` contains these settings. The core game is client-side; optional generated speech uses one Vercel function at `/api/voice`. No database is required. Vercel provides the HTTPS needed for optional microphone access.

For generated speech, set the server-side `ELEVENLABS_API_KEY` in Vercel. For the optional microphone intercom, see [ElevenLabs setup](docs/ELEVENLABS.md). Never put an ElevenLabs API key in a `VITE_` variable or in the browser.

## Controls

| Control | Action |
| --- | --- |
| Click the 3D scene | Capture mouse for first-person look |
| WASD | Walk through the house |
| Right mouse + left mouse | Aim and fire at the person outside |
| 1 / 2 / 3 | Temperature / pulse / UV scan |
| E | Interact with the object under the crosshair |
| F | Toggle the torch |
| Escape | Pause / release mouse |
| On-screen buttons | Questions, scans, decisions, room locations, settings |

On narrow displays, the interface stacks vertically and all core actions remain available through buttons. A keyboard and mouse are recommended for first-person movement. The game requires WebGL 2 and graphics acceleration.

## Architecture

- `src/game.js`: deterministic state transitions and persistence.
- `src/content.js`: original adult cast, documents, ending narratives.
- `src/scene.js`: Three.js environment, portrait rendering and weapon geometry, movement, lighting and impacts.
- `src/main.js`: game interface, input, timers and narrative flow.
- `src/audio.js`: Web Audio ambience and playback of ElevenLabs audio.
- `src/voice.js`: lazy ElevenLabs connection, transcript, mute and disconnect.
- `tests/game.test.js`: randomized-run, state-transition, puzzle, ending and persistence tests.

Progress is stored only in the player's browser. Clearing browser data clears it. Voice transcripts are kept only in memory by this app; ElevenLabs may retain conversations according to the configured agent's account settings. Closing the intercom panel does not end a connection: use **Disconnect**. Leaving the game ends it; hiding the tab mutes its microphone.

## Visual and audio scope

All meshes, effects and text are authored for this project. The twelve visitors now use generated photographic portraits instead of geometric mannequin models. See [art provenance and prompts](docs/ART.md) for the included image assets. Environmental sounds are synthesized locally. Visitor dialogue and disconnected name calls use a server-side ElevenLabs endpoint; connected name cues are performed live by the configured agent. No browser speech synthesis is used. No Minimax video or pre-rendered cinematic is included. ElevenLabs requires your own configuration; automated tests mock sessions and the paid API. See [house modelling notes](docs/HOUSE.md) for the model approximation, room layout and GLB export command.

Fonts: Barlow Condensed, DM Sans and IBM Plex Mono via Google Fonts, with local fallbacks. Three.js and ElevenLabs dependencies retain their upstream licenses. The repository does not grant a separate license for the original game content.
