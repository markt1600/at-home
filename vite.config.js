import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'ELEVENLABS_AGENT_ID');

  return {
    define: {
      // This public agent identifier is the only unprefixed variable sent to the browser.
      'import.meta.env.ELEVENLABS_AGENT_ID': JSON.stringify(env.ELEVENLABS_AGENT_ID || ''),
    },
  };
});
