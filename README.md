# At Home

A relaxing first-person home-life game. Watch morning turn into evening, welcome neighbors for tea, care for Miso the cat, Sunny the dog and Pebble the tortoise, and revisit memories in the places where they happened.

This is a separate game derived from the authored house reconstruction in `markt1600/human`. It has its own saved state, friendly cast, visual style, voice prompts and gameplay. There is no combat, hidden threat, score or losing state.

## Your day

- Walk freely through the furnished house and both balconies. Small steps are climbed automatically.
- An active day takes about 20 minutes; choose slower, faster, or hold the current time. Rest until sunrise or skip to sunset.
- Ken visits around 09:00, Nia at 13:00, June at 17:00. Chat at the door or invite them inside; guests remain visible for a while.
- Fill pet food bowls, refresh water and spend time together. Needs pause in menus and while away. Pets cannot become ill or die.
- Make tea, put on an original gentle melody, tend plants, read, or watch the sky. Small moments are saved in a journal.
- Six locally generated MiniMax clips add friendly waves, nods, blinks, tail movements and tortoise movement. Nearby characters animate and appear in ordinary mirror/window reflections.
- Memory markers offer a photo/video popup when approached. Playback pauses the day and quiets the game audio. Add your own files at your current position or one of the preset spots; these stay in your browser's IndexedDB.

Desktop: WASD/arrows to move, mouse to look, E to interact, Esc to release the mouse. Room buttons provide accessible quick navigation. Touch: drag the room to look and use the arrow controls to move.

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

## Memories and source material

Personal test memories remain local by default. The public memory catalog starts empty; browser-added files are never uploaded. Clearing site data removes browser memories, so retain original files. See [memory placements and publication](docs/MEMORIES.md).

The public code includes authored geometry and dimensions, generated characters, and prepared artwork. It excludes the address, original architectural PDFs, house walkthrough and source photographs. The view outside the balconies is an imagined garden neighborhood, not a reconstruction of the real surroundings.

## Validation

`npm test` checks floor-plan connectivity, wall and opening geometry, furniture clearance, stair movement, surface overlaps, the day/visit/pet state machine, memory placement, and bounded server-side voice requests. `npm run build` verifies the production bundle. Real microphone chat additionally requires a configured agent and a deployment with microphone permission.
