// Copies the single-threaded lite Stockfish build into public/engine/
// so Vite serves it untouched (Emscripten fetches the .wasm relative to the .js).
// Run: npm run sync:stockfish
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const clientRoot = join(here, '..');
const require = createRequire(join(clientRoot, 'package.json'));

const pkgPath = require.resolve('stockfish/package.json');
const pkgDir = dirname(pkgPath);

const candidates = ['src', 'bin'];
let base = null;
for (const dir of candidates) {
  const js = join(pkgDir, dir, 'stockfish-19-lite-single.js');
  const wasm = join(pkgDir, dir, 'stockfish-19-lite-single.wasm');
  if (existsSync(js) && existsSync(wasm)) {
    base = dir;
    break;
  }
}
if (!base) {
  throw new Error('stockfish lite-single build not found in stockfish package');
}

const outDir = join(clientRoot, 'public', 'engine');
mkdirSync(outDir, { recursive: true });
copyFileSync(join(pkgDir, base, 'stockfish-19-lite-single.js'), join(outDir, 'stockfish-lite-single.js'));
copyFileSync(
  join(pkgDir, base, 'stockfish-19-lite-single.wasm'),
  join(outDir, 'stockfish-lite-single.wasm')
);
console.log(`stockfish lite-single synced from ${base}/ to public/engine/`);
