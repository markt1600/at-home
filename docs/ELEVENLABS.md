# A friendly voice for At Home

Create a separate conversational agent for this game. Paste [AGENT_PROMPT.txt](AGENT_PROMPT.txt) into its system prompt and select a warm, conversational voice.

First message:

> Welcome home, {{player_name}}. It's good to see you. How is your day going?

Dynamic variables:

- `player_name`: default `friend` for dashboard tests.
- `game_context`: default `A peaceful morning at home. No neighbors are visiting yet. Miso the cat, Sunny the dog and Pebble the tortoise live here.` for dashboard tests.

The game replaces both variables when connecting and sends updated game context during play. They are **not environment variables**. Treat the prompt context as text; a player nickname is not an instruction.

In Vercel, set `ELEVENLABS_AGENT_ID` to this new agent ID and redeploy. The build exposes only this public identifier to the browser. Allow your new game's deployed domain in the agent's origin settings if origin restrictions are enabled. The current integration expects an agent that supports a browser client connection with its ID.

Set `ELEVENLABS_API_KEY` separately in Vercel for authored neighbor dialogue and occasional personalized greetings. It is used only by `api/voice.js`. Optionally select a companion voice with `ELEVENLABS_VOICE_ID` and neighbor voices with `ELEVENLABS_MALE_VOICE_ID` / `ELEVENLABS_FEMALE_VOICE_ID`.

Authored speech uses `eleven_multilingual_v2`; it has no whispered prompts or browser speech fallback. Requests accept only fixed line IDs and a bounded nickname. Voice calls are rate-limited and cached within the function instance. A public production project with substantial traffic should add durable rate limiting and usage monitoring.

Players can decline personalized greetings. The microphone connects only through Voice → Connect microphone and can be muted or disconnected. Memory playback mutes game speech and pauses the companion microphone until the memory closes.

Verify after deployment: enter a nickname, hear a welcome, advance to a neighbor visit and hear an authored reply, then connect Voice and ask who is visiting. The agent should answer from current game context rather than inventing a scene.
