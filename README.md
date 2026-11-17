# At Home

A relaxing first-person home-life game. Watch morning turn into evening, care for Miso the cat, Leo the English cream dachshund and Pebble the tortoise, and revisit memories in the places where they happened.

[Play At Home](https://athome.marktan.ai) · [Memory studio](https://athome.marktan.ai/admin)

This is a separate game derived from the authored house reconstruction in `markt1600/human`. It has its own saved state, friendly cast, visual style, voice prompts and gameplay. There is no combat, hidden threat, score or losing state.

## Your day

- Walk freely through the furnished house and both balconies. Small steps are climbed automatically; Space jumps onto sofas, beds and tables.
- An active day takes about 20 minutes; choose slower, faster, or hold the current time. Rest until sunrise or skip to sunset.
- Fill pet food bowls, refresh water and spend time together. Needs pause in menus and while away. Pets cannot become ill or die.
- Make tea, play uploaded music on the turntable, tend plants, read, or watch the sky. Small moments are saved in a journal. The vinyl spins during playback and rests when stopped.
- Leo, Miso and Pebble wander along clear routes around furniture and stairs, stopping to rest or when approached. Pebble takes things more slowly. Their existing local MiniMax clips add blinks, tail movements and tortoise movement, including in mirror/window reflections.
- Sunbirds circle the olive tree and drink at the hanging feeder throughout the day. Fictional neighbors walk, wave, stretch and have coffee on balconies across the street.
- Blue photo and amber video markers open soft-edged memories over a blurred view of the house. Albums cycle through photos every two seconds and can have an optional continuous soundtrack. Playback pauses the day and quiets game audio; closing restores ambience and resumes the turntable from its previous position. Date and description stay readable below the memory.
- Continue a saved day or start a new game. In Pause, filter memories by year or a custom date range. Starting a new day preserves the memory library.

Desktop: enter the house to start walking with a center cursor. WASD/arrows move, mouse looks, Space jumps, E interacts and Esc closes popups or opens Pause. M opens memories, P pets, R rituals, J journal, V voice, O room navigation and H the key guide. Number keys select popup options. During memories, Space pauses playback, left/right arrows change slides and Esc immediately returns to wandering. Touch: drag to look and use the arrow controls to move.

## Light, weather and loading

- **Soft lighting.** Surfaces that meet (a sofa and the floor, a shelf and the wall) get soft contact shadows, and lamps, candles, the tree lights and the sun have a gentle glow. Pause has a **Soft lighting** setting: Automatic (on for computers, off for phones and tablets, and switched off for the visit if the frame rate cannot be held even at the lowest resolution), Always on, or Off. The choice is kept on the device. `src/post-effects.js`.
- **The hour changes the rooms.** The sun is low and warm at each end of the day and white at noon; after dark a cool moon lights the windows, the lamps and downlights brighten and the fill light drops, so rooms are lit in pools. Polished surfaces (marble, steel, glass, the timber floor) reflect a soft neutral room. `lightingState` in `src/daylight.js` holds every number.
- **Rain.** From the second day, about three days in ten have one shower of a few hours. It falls around the house (never under the roof), runs down the fixed window glass, greys the sky, brings the lamps up a little and is heard softly indoors and openly on a balcony. Each day's weather is fixed, so a saved day looks the same when you return. `src/weather.js`.
- **Loading.** Before the house opens only two short films per pet are fetched; the other viewing angles and activities follow in the background, nearest pet first. The surface atlas is a 0.5 MB WebP (was 3 MB).

## Special days

**The house** card in the memory studio has **Special days**: a name, a date and a balloon colour scheme. On that date each year (in the visitor's own time zone) bunches of balloons stand in the living room, dining room and entrance and the welcome message names the day. 29 February is kept on the 28th outside leap years. Independently, any memory whose date is today in an earlier year gets three balloons beside its marker. The list is stored with Christmas mode in `settings/house.json`. `src/occasions.js`, `src/celebrations.js`.

## More with the pets

In a pet's panel (P):

- **Walk out to a balcony** (Leo and Cyrus). The pet heels beside you, following through doorways; stay out on either balcony together for a quarter of a minute to complete the walk. It ends by itself after four minutes indoors.
- **Teach a trick.** Leo has Sit, Spin and Give a paw; Cyrus has Come when called and High five; Pebble has Follow the leaf. A trick takes three lessons with a 40-second rest between lessons for that pet; a learnt trick can be asked for at any time. You need to be within a few metres.
- **Today's favourite spot.** Each pet picks one place per day of the game, returns there to rest, and never picks the same place two days running. The panel says where; finding the pet settled there is recorded in the journal once a day.

Progress is saved with the game. `src/pet-days.js`.

## Photos become memories

**Take a photo** in Pause now has **Keep as a memory**, with a title suggested from the room and any pets in the frame. If you are signed in to the memory studio in this browser the photo is uploaded as a private draft; otherwise it is saved on the device. Either way its marker is where you stood, dated today. `src/photo-memory.js`.

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

- `ELEVENLABS_API_KEY`: secret, server-side only, for authored spoken greetings.
- `ELEVENLABS_AGENT_ID`: the public ID of a **new friendly companion agent**, for microphone conversations. Redeploy after changing it.
- Optional `ELEVENLABS_VOICE_ID` to choose the companion voice.

Use the new [agent prompt and first message](docs/ELEVENLABS.md). The previous game's agent configuration should not be used for this game. `player_name` and `game_context` are dynamic values supplied by the game, not Vercel environment variables.

No browser text-to-speech fallback is used. If generated speech is unavailable, the home companion still has a text transcript. Connecting Voice is always an explicit microphone action.

For cloud memories and music, connect a **private** Vercel Blob store and set `MEMORY_ADMIN_PASSWORD` to a separate password of at least 6 characters in the deployment environment. Redeploy after adding variables. Vercel supplies `BLOB_READ_WRITE_TOKEN`; both values remain server-side. The studio is at `/admin`. See [memories](docs/MEMORIES.md) and [the music library](docs/MUSIC.md).

## Christmas mode

The memory studio (`/admin`, signed in) has a **The house** card with a Christmas-mode switch. Switched on, a Christmas tree stands in the sunken living room beside the turntable rack: a fir in a toile hat box with warm twinkling lights, red, green and gold baubles, plush bunnies and monsters, red ribbons, a fluffy wreath with stars and a bow on top, and the shopping bags and presents underneath. Walk up to the tree and interact to switch its string lights on: five circuits blink on their own beats with a chase running round the tree, and the glow breathes with them. Your lights choice is remembered on the device. The Christmas-mode switch is stored in the private store (`settings/house.json`) and read by every visitor's game before the house is built, so it stays on across games and devices until it is switched off. `src/christmas-tree.js` builds the tree; `api/house-settings.js` holds the switch.

## Memories and source material

Personal test memories remain local by default. Browser-added files stay on the device until deliberately copied to the cloud in the signed-in memory studio. Cloud uploads start as private drafts; the editor explicitly publishes a memory to show it to game visitors. The studio can also keep untouched originals, restore deleted memories for 30 days, undo story edits, download the whole library as a zip and maintain a second copy in another store; see [keeping memories safe](docs/MEMORIES.md#keeping-memories-safe).

The public code includes authored geometry and dimensions, generated characters, and prepared artwork. It excludes the address, original architectural PDFs, house walkthrough and source photographs. Exterior tower shapes follow the supplied balcony photos; distances and unseen elevations are estimates. All balcony occupants are fictional.

## Validation

`npm test` checks floor-plan connectivity, wall and opening geometry, furniture clearance, stair movement, surface overlaps, the day/pet state machine, memory placement, and bounded server-side voice requests. `npm run build` verifies the production bundle. Real microphone chat additionally requires a configured agent and a deployment with microphone permission.
