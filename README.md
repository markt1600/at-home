# At Home

A relaxing first-person home-life game. Watch morning turn into evening, welcome neighbors for tea, care for Miso the cat, Leo the English cream dachshund and Pebble the tortoise, and revisit memories in the places where they happened.

[Play At Home](https://athome.marktan.ai) · [Memory studio](https://athome.marktan.ai/admin)

This is a separate game derived from the authored house reconstruction in `markt1600/human`. It has its own saved state, friendly cast, visual style, voice prompts and gameplay. There is no combat, hidden threat, score or losing state.

## Your day

- Walk freely through the furnished house and both balconies. Small steps are climbed automatically; Space jumps onto sofas, beds and tables.
- An active day takes about 20 minutes; choose slower, faster, or hold the current time. Rest until sunrise or skip to sunset.
- Ken visits around 09:00, Nia at 13:00, June at 17:00. Chat at the door or invite them inside; guests remain visible for a while.
- Fill pet food bowls, refresh water and spend time together. Needs pause in menus and while away. Pets cannot become ill or die.
- Make tea, play uploaded music on the turntable, tend plants, read, or watch the sky. Small moments are saved in a journal. The vinyl spins during playback and rests when stopped.
- Six locally generated MiniMax clips add friendly waves, nods, blinks, tail movements and tortoise movement. Nearby characters animate and appear in ordinary mirror/window reflections.
- Sunbirds circle the olive tree and drink at the hanging feeder throughout the day. Fictional neighbors walk, wave, stretch and have coffee on balconies across the street.
- Blue photo and amber video markers open soft-edged memories over a blurred view of the house. Albums cycle through photos every two seconds. Playback pauses the day and quiets game audio, including the turntable. Date and description stay readable below the memory.
- Continue a saved day or start a new game. In Pause, filter memories by year or a custom date range. Starting a new day preserves the memory library.

Desktop: enter the house to start walking with a center cursor. WASD/arrows move, mouse looks, Space jumps, E interacts and Esc closes popups or opens Pause. M opens memories, P pets, R rituals, J journal, N neighbors, V voice, O room navigation and H the key guide. Number keys select popup options. During memories, Space pauses playback, left/right arrows change slides and Esc immediately returns to wandering. Touch: drag to look and use the arrow controls to move.

## Run locally

Node 20.19 or newer:

```sh
npm ci
npm run dev
npm test
npm run build
```

The development server binds only to localhost. The spoken-audio endpoint runs as a Vercel function; a plain Vite development server does not serve it. Text conversations and environmental audio work independently of voice configuration.

## Vercel

Import this repository as a new Vite project. Build: `npm run build`; output: `dist`. Optional environment variables:

- `ELEVENLABS_API_KEY`: secret, server-side only, for authored spoken greetings and neighbor replies.
- `ELEVENLABS_AGENT_ID`: the public ID of a **new friendly companion agent**, for microphone conversations. Redeploy after changing it.
- Optional `ELEVENLABS_VOICE_ID`, `ELEVENLABS_MALE_VOICE_ID`, `ELEVENLABS_FEMALE_VOICE_ID` to choose voices.

Use the new [agent prompt and first message](docs/ELEVENLABS.md). The previous game's agent configuration should not be used for this game. `player_name` and `game_context` are dynamic values supplied by the game, not Vercel environment variables.

No browser text-to-speech fallback is used. If generated speech is unavailable, all neighbor conversations remain readable. Connecting Voice is always an explicit microphone action.

For cloud memories and music, connect a **private** Vercel Blob store and set `MEMORY_ADMIN_PASSWORD` to a separate password of at least 6 characters in the deployment environment. Redeploy after adding variables. Vercel supplies `BLOB_READ_WRITE_TOKEN`; both values remain server-side. The studio is at `/admin`. See [memories](docs/MEMORIES.md) and [the music library](docs/MUSIC.md).

## Memories and source material

Personal test memories remain local by default. Browser-added files stay on the device until deliberately copied to the cloud in the signed-in memory studio. Cloud uploads start as private drafts; the editor explicitly publishes a memory to show it to game visitors. Keep original files as a backup. See [memory placements and publication](docs/MEMORIES.md).

The public code includes authored geometry and dimensions, generated characters, and prepared artwork. It excludes the address, original architectural PDFs, house walkthrough and source photographs. Exterior tower shapes follow the supplied balcony photos; distances and unseen elevations are estimates. All balcony occupants are fictional.

## Validation

`npm test` checks floor-plan connectivity, wall and opening geometry, furniture clearance, stair movement, surface overlaps, the day/visit/pet state machine, memory placement, and bounded server-side voice requests. `npm run build` verifies the production bundle. Real microphone chat additionally requires a configured agent and a deployment with microphone permission.
