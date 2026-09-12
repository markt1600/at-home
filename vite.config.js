import { defineConfig, loadEnv } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'ELEVENLABS_AGENT_ID');
  let outputDirectory;

  return {
    plugins: [{
      name: 'only-publish-catalogued-memories',
      apply: 'build',
      configResolved(config) { outputDirectory = path.resolve(config.root, config.build.outDir); },
      closeBundle() {
        const directory = path.join(outputDirectory, 'memories');
        if (!fs.existsSync(directory)) return;
        const catalog = JSON.parse(fs.readFileSync(path.join(directory, 'catalog.json'), 'utf8'));
        const allowed = new Set(['catalog.json']);
        for (const memory of catalog) for (const value of [memory.src, memory.poster]) {
          if (typeof value === 'string' && /^\/memories\/[^/\\]+$/.test(value)) allowed.add(path.basename(value));
        }
        for (const entry of fs.readdirSync(directory, {withFileTypes:true})) {
          if (entry.isFile() && !allowed.has(entry.name)) fs.unlinkSync(path.join(directory, entry.name));
        }
      },
    }],
    define: {
      // This public agent identifier is the only unprefixed variable sent to the browser.
      'import.meta.env.ELEVENLABS_AGENT_ID': JSON.stringify(env.ELEVENLABS_AGENT_ID || ''),
    },
  };
});
