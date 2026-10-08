// WCAG contrast check for app tokens + board themes. Run: node scripts/check-contrast.mjs
function hexRgb(hex) {
  const h = hex.replace('#', '');
  const v =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

function lum([r, g, b]) {
  const f = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** Composite rgba foreground over opaque background. */
function over(fg, bg) {
  const [r1, g1, b1, a] = fg;
  return [r1 * a + bg[0] * (1 - a), g1 * a + bg[1] * (1 - a), b1 * a + bg[2] * (1 - a)];
}

function ratio(a, b) {
  const l1 = lum(a);
  const l2 = lum(b);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT_MIN = 4.5;
const UI_MIN = 3;

const checks = [
  // [name, fg, bg, min]
  ['light text/bg', '#0f172a', '#f8fafc', TEXT_MIN],
  ['light muted/bg', '#64748b', '#f8fafc', TEXT_MIN],
  ['light muted/surface', '#64748b', '#ffffff', TEXT_MIN],
  ['light text/surface', '#0f172a', '#ffffff', TEXT_MIN],
  ['light white/accent-600', '#ffffff', '#4f46e5', TEXT_MIN],
  ['light accent-600/surface', '#4f46e5', '#ffffff', TEXT_MIN],
  ['light white/danger-600', '#ffffff', '#e11d48', TEXT_MIN],
  ['light var(--danger)/surface', '#e11d48', '#ffffff', TEXT_MIN],
  ['light var(--warning)/surface', '#b45309', '#ffffff', TEXT_MIN],
  ['light var(--success)/surface', '#047857', '#ffffff', TEXT_MIN],
  ['dark text/bg', '#f1f5f9', '#020617', TEXT_MIN],
  ['dark muted/bg', '#94a3b8', '#020617', TEXT_MIN],
  ['dark muted/surface', '#94a3b8', '#0f172a', TEXT_MIN],
  ['dark white/accent-600', '#ffffff', '#4f46e5', TEXT_MIN],
  ['dark accent-400/surface', '#818cf8', '#0f172a', TEXT_MIN],
  ['dark var(--danger)/surface', '#fb7185', '#0f172a', TEXT_MIN],
  ['dark var(--warning)/surface', '#fbbf24', '#0f172a', TEXT_MIN],
  ['dark var(--success)/surface', '#34d399', '#0f172a', TEXT_MIN],
  // board squares vs each other (adjacent-square distinguishability, UI 3:1 target)
  ['classic light/dark', '#f0d9b5', '#a06a3b', UI_MIN],
  ['wooden light/dark', '#e9d8b4', '#9c6b43', UI_MIN],
  ['slate light/dark', '#e8edf3', '#5b749b', UI_MIN],
  // Pieces are large graphical objects (WCAG non-text 3:1); white pieces also carry a dark outline.
  ['dark piece/classic-light', '#1c1917', '#f0d9b5', UI_MIN],
  ['dark piece/classic-dark', '#1c1917', '#a06a3b', UI_MIN],
  ['light piece/classic-dark', '#f8fafc', '#a06a3b', UI_MIN],
];

let fail = 0;
for (const [name, fg, bg, min] of checks) {
  const r = ratio(hexRgb(fg), hexRgb(bg));
  const ok = r >= min;
  if (!ok) fail += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.toFixed(2)}:1  (min ${min})  ${name}`);
}

// highlight overlays composited on squares
const overlays = [
  ['last-move on classic-light', [99, 102, 241, 0.42], '#f0d9b5'],
  ['last-move on classic-dark', [99, 102, 241, 0.42], '#a06a3b'],
  ['selected on classic-light', [99, 102, 241, 0.55], '#f0d9b5'],
  ['check on classic-light', [244, 63, 94, 0.72], '#f0d9b5'],
  ['dot on classic-light', [15, 23, 42, 0.28], '#f0d9b5'],
];
for (const [name, fg, bgHex] of overlays) {
  const r = ratio(over(fg, hexRgb(bgHex)), hexRgb(bgHex));
  console.log(`INFO  ${r.toFixed(2)}:1  highlight vs base  ${name}`);
}

if (fail > 0) {
  console.log(`\n${fail} check(s) below minimum`);
  process.exitCode = 1;
} else {
  console.log('\nAll minimums met');
}
