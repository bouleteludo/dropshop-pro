#!/usr/bin/env node
// Checks WCAG contrast of every color scheme of every theme in shopify/themes:
// text, muted text, accent and outline buttons on the background and on cards,
// and button labels on buttons. The Theme Store requires 4.5:1 for body text.
//
//   node shopify/scripts/check-contrast.mjs

import fs from 'node:fs';
import path from 'node:path';

const THEMES = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../themes');
const MIN = 4.5;

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const channel = (v) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
// Same blends as snippets/css-variables.liquid (muted text 78%, cards 5%).
const mix = (fg, bg, alpha) => fg.map((f, i) => Math.round(f * alpha + bg[i] * (1 - alpha)));

let failures = 0;
for (const theme of fs.readdirSync(THEMES)) {
  const file = path.join(THEMES, theme, 'config/settings_data.json');
  if (!fs.existsSync(file)) continue;
  const data = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\s*\/\*[\s\S]*?\*\//, ''));
  for (const [preset, settings] of Object.entries(data.presets)) {
    for (const [id, { settings: s }] of Object.entries(settings.color_schemes)) {
      const bg = rgb(s.background);
      const text = rgb(s.text);
      const checks = [['button label', ratio(rgb(s.button_label), rgb(s.button))]];
      for (const [name, surface] of [['background', bg], ['card', mix(text, bg, 0.05)]]) {
        checks.push([`text/${name}`, ratio(text, surface)]);
        checks.push([`muted/${name}`, ratio(mix(text, surface, 0.78), surface)]);
        checks.push([`accent/${name}`, ratio(rgb(s.accent), surface)]);
        checks.push([`outline/${name}`, ratio(rgb(s.secondary_button_label), surface)]);
      }
      const bad = checks.filter(([, value]) => value < MIN);
      const worst = checks.reduce((a, b) => (b[1] < a[1] ? b : a));
      console.log(`${theme} / ${preset} / ${id}: lowest ${worst[0]} ${worst[1].toFixed(2)}${bad.length ? '  FAIL' : ''}`);
      failures += bad.length;
    }
  }
}
console.log(failures ? `\n${failures} contrast failure(s)` : '\nAll color schemes pass 4.5:1');
process.exit(failures ? 1 : 0);
