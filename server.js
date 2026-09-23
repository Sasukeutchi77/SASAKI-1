import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const distServer = path.join(__dirname, 'dist', 'server.cjs');

async function launch() {
  if (fs.existsSync(distServer)) {
    // Compiled production bundle exists: load it immediately
    require(distServer);
  } else {
    console.log('[PurgeInfo Server] dist/server.cjs not found. Running build automatically...');
    try {
      const { execSync } = await import('child_process');
      execSync('npm run build', { stdio: 'inherit', env: process.env });
      if (fs.existsSync(distServer)) {
        require(distServer);
      } else {
        throw new Error('Build finished but dist/server.cjs was not found.');
      }
    } catch (err) {
      console.warn('[PurgeInfo Server] Automated build error, falling back to tsx server.ts runner:', err.message);
      const { spawn } = await import('child_process');
      const child = spawn('npx', ['tsx', 'server.ts'], { stdio: 'inherit', env: process.env });
      child.on('exit', (code) => process.exit(code || 0));
    }
  }
}

launch();
