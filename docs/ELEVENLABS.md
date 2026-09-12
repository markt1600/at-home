# ElevenLabs voices for the house

Replace the agent's system prompt with [AGENT_PROMPT.txt](AGENT_PROMPT.txt).

Set **First message** to:

> {{player_name}}… I thought you were in the other room. Is your front door locked?

Keep these dynamic variables:

| Variable | Default |
| --- | --- |
| `player_name` | `Resident` |
| `game_context` | `The resident is exploring their home before the first knock.` |

Both variables are sent by the game, not stored as Vercel environment variables. The chosen nickname and discovered observations are updated during play. Hidden visitor identities are never sent.

## Vercel configuration

| Environment variable | Purpose |
| --- | --- |
| `ELEVENLABS_AGENT_ID` | Public agent ID for optional live microphone conversation. Exposed intentionally at build time. |
| `ELEVENLABS_API_KEY` | Secret used only by the server function for generated speech. Requires text-to-speech access. Never use a VITE_ prefix. |
| `ELEVENLABS_VOICE_ID` | Optional voice for name calls. Otherwise the function tries the configured agent's voice, then the stock George voice. |
| `ELEVENLABS_MALE_VOICE_ID` / `ELEVENLABS_FEMALE_VOICE_ID` | Optional visitor voice overrides; defaults are George and Sarah. |

After changing Production environment variables, redeploy. Set the public agent's allowed origins to your deployed domain. Configure its voice, conversation limits and transcript events in ElevenLabs.

## How speech works

All spoken audio comes from ElevenLabs. **There is no browser text-to-speech fallback.** Environmental rain, hum, footsteps, knocks and weapon effects are generated locally with Web Audio.

Visitor dialogue is generated through `POST /api/voice` using Eleven Multilingual v2 and cached in memory. Name calls use Eleven v3 with its whisper delivery tag. The endpoint accepts only authored game dialogue or predefined nickname templates, limits nickname length, rejects foreign browser origins, caps requests per IP per warm function instance, and keeps a bounded audio cache. Serverless instance-local limits are best-effort; use Vercel Firewall limits and ElevenLabs account quotas for durable production spending controls.

When the live intercom is connected and quiet, ambient calls are performed by the conversational agent instead. The first name call occurs after 28–45 active seconds, then at irregular 75–120 second intervals, capped at six per play session. Mirror scares can trigger a separate short call, at most four times. Calls do not start while paused, hidden, disabled or after relay shutdown. Late generated audio is cancelled when gameplay moves on. Visitor voices and personalized calls each have settings.

Name calls send the chosen nickname to ElevenLabs without requiring a microphone connection. Microphone audio is sent only after **Connect microphone**. Closing the intercom panel leaves the session connected; use Disconnect to end it. Hiding the tab mutes the microphone.

If speech is unavailable, readable dialogue remains on screen and the game reports that ElevenLabs voice is unavailable. It never silently substitutes browser voices.

## Local development and verification

`npm run dev` / `npm run preview` serve the client. To exercise the server function with real credentials locally, use Vercel's development environment. Automated tests mock the paid API and verify allowed lines, credential isolation, caching, failures, name handling and cancellation.

Official references: [Create speech](https://elevenlabs.io/docs/api-reference/text-to-speech/convert), [v3 whisper tags](https://elevenlabs.io/docs/help-center/product/core-capabilities/text-to-speech/how-do-audio-tags-work-with-eleven-v3-alpha), [agent configuration](https://elevenlabs.io/docs/eleven-agents/api-reference/agents/get), [JavaScript agent SDK](https://elevenlabs.io/docs/eleven-agents/libraries/java-script).
