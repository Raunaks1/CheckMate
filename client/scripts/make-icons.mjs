// Generates favicon.svg, icon SVG source, and og.svg from the knight piece art.
// Run: node scripts/make-icons.mjs  (then rasterize with qlmanage, see below)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const knight = readFileSync(join(root, 'public/pieces/wN.svg'), 'utf8');
const inner = knight
  .replace(/^[\s\S]*?<svg[^>]*>/, '')
  .replace(/<\/svg>\s*$/, '')
  .replace(/#1f1a17/g, '#ffffff');

function appIcon(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#4f46e5"/><svg x="8" y="7" width="48" height="48" viewBox="0 0 50 50">${inner}</svg></svg>\n`;
}

writeFileSync(join(root, 'public/favicon.svg'), appIcon(64));
writeFileSync(join(root, 'scripts/icon-src.svg'), appIcon(512));

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#312e81"/><circle cx="1050" cy="80" r="320" fill="#4f46e5" opacity="0.45"/><circle cx="120" cy="620" r="260" fill="#4f46e5" opacity="0.35"/><svg x="110" y="175" width="280" height="280" viewBox="0 0 50 50">${inner}</svg><text x="430" y="300" font-family="Inter, -apple-system, 'Segoe UI', sans-serif" font-size="120" font-weight="700" fill="#ffffff">Checkmate</text><text x="434" y="380" font-family="Inter, -apple-system, 'Segoe UI', sans-serif" font-size="44" fill="#c7d2fe">Play chess with friends, anywhere.</text></svg>\n`;
writeFileSync(join(root, 'public/og.svg'), og);

console.log('wrote favicon.svg, icons/icon-src.svg, og.svg');
