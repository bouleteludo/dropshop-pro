#!/usr/bin/env node
// Packages the Lanterne theme (shopify/theme) for Shopify.
//
//   node shopify/scripts/package-themes.mjs
//
// Outputs, in shopify/dist:
//   demo/lanterne-<style>.zip   one zip per style, with that style applied
//                               (settings, home page, header, footer): upload
//                               it to the matching demo store.
//   lanterne-theme-store.zip    the Theme Store submission, with the
//                               /listings folder. Only built once the
//                               pre-submission checks below pass.
//
// No dependencies: Node 22+ (zlib.crc32).

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const THEME = path.join(ROOT, 'theme');
const DIST = path.join(ROOT, 'dist');
const THEME_DIRS = ['assets', 'blocks', 'config', 'layout', 'locales', 'sections', 'snippets', 'templates'];
const STYLES = ['Lanterne', 'Sapin', 'Printemps', 'Velours', 'Rivage'];

// Built-in images that still show the BOO SHOP shop sign. The Theme Store
// forbids brand names in a theme: replace these files (same names) with
// versions without any sign or text before submitting.
const BRANDED_ASSETS = {
  '93b7a314ca4b67458937ec79e24cbc9ca70a95352f7f5a93dea091c5e0466a32': 'hero-halloween',
  '36ac6951989556b5c464837b9ecc9fc7abd9914e13ebc9a53b7bda37d876d161': 'hero-halloween',
  '21f7cb0f81f34b8e5022f16a3e9d351f1f97ae6608242a795a1f0be4d125ae70': 'hero-halloween',
  '95c0929607364748044208b32ba16058ecb3bbb4755dec96f3087024d7560df6': 'hero-halloween',
  '4a89f047fb5ce9102140f91d4b1b441434977e7df3133e6c685e11526eb5a66f': 'hero-noel',
  dfa2cbac1568c58f063e43ae97022274a25bfd9053b7fb24d0264056fbc2002b: 'hero-noel',
  cea305843d098d6483099208656764fb9b9a83c8f00dfc24ebc357c3a6898857: 'hero-noel',
  e2b7dd77c8ce8cd5a384ca08b65534ceec3ab43e9d5a741e9c43cac824820ace: 'hero-noel',
  e883947c1687b135ffe187af87a9d96efb7abc269d018714b7751ba8a3a813c6: 'hero-paques',
  '5450e8f3f1767bac4951f1734bf49a32229dcbc5b427dbeb147d633e99b0d157': 'hero-paques',
  '75cf12269b05c79c20d1a6a114ebca637894eb93f5be9c3854559c5761f37cda': 'hero-paques',
  b2b13140235120b95cb40f8a644cbd424120210c40b6e6b213af404c3aca8aa2: 'hero-paques',
};

const kebab = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const stripComment = (text) => text.replace(/^\s*\/\*[\s\S]*?\*\//, '');

function listFiles(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full, base) : [path.relative(base, full).split(path.sep).join('/')];
  });
}

function themeFiles({ withListings }) {
  const files = new Map();
  for (const dir of THEME_DIRS) {
    for (const rel of listFiles(path.join(THEME, dir))) {
      files.set(`${dir}/${rel}`, fs.readFileSync(path.join(THEME, dir, rel)));
    }
  }
  if (withListings) {
    for (const rel of listFiles(path.join(THEME, 'listings'))) {
      files.set(`listings/${rel}`, fs.readFileSync(path.join(THEME, 'listings', rel)));
    }
  }
  return files;
}

// Minimal zip writer (deflate) — enough for theme uploads.
function zip(files) {
  const local = [];
  const central = [];
  let offset = 0;
  for (const [name, data] of [...files.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const nameBuf = Buffer.from(name, 'utf8');
    const compressed = zlib.deflateRawSync(data, { level: 9 });
    const useDeflate = compressed.length < data.length;
    const body = useDeflate ? compressed : data;
    const crc = zlib.crc32(data);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x0800, 6);
    header.writeUInt16LE(useDeflate ? 8 : 0, 8);
    header.writeUInt32LE(0, 10);
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(body.length, 18);
    header.writeUInt32LE(data.length, 22);
    header.writeUInt16LE(nameBuf.length, 26);
    header.writeUInt16LE(0, 28);
    local.push(header, nameBuf, body);

    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(0x0800, 8);
    entry.writeUInt16LE(useDeflate ? 8 : 0, 10);
    entry.writeUInt32LE(0, 12);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(body.length, 20);
    entry.writeUInt32LE(data.length, 24);
    entry.writeUInt16LE(nameBuf.length, 28);
    entry.writeUInt32LE(offset, 42);
    central.push(entry, nameBuf);
    offset += header.length + nameBuf.length + body.length;
  }
  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.size, 8);
  end.writeUInt16LE(files.size, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, centralBuf, end]);
}

const settingsPath = 'config/settings_data.json';
const settingsText = fs.readFileSync(path.join(THEME, settingsPath), 'utf8');
const settingsHeader = settingsText.match(/^\s*\/\*[\s\S]*?\*\/\s*/)?.[0] ?? '';
const settings = JSON.parse(stripComment(settingsText));

/* ---------- Demo store zips: one per style ---------- */
fs.mkdirSync(path.join(DIST, 'demo'), { recursive: true });
for (const style of STYLES) {
  if (!settings.presets[style]) throw new Error(`Style "${style}" is missing from ${settingsPath}`);
  const files = themeFiles({ withListings: false });
  const listing = path.join(THEME, 'listings', kebab(style));
  for (const rel of listFiles(listing)) files.set(rel, fs.readFileSync(path.join(listing, rel)));
  const styled = { ...settings, current: settings.presets[style] };
  files.set(settingsPath, Buffer.from(`${settingsHeader}${JSON.stringify(styled, null, 2)}\n`));

  const out = path.join(DIST, 'demo', `lanterne-${kebab(style)}.zip`);
  fs.writeFileSync(out, zip(files));
  console.log(`${path.relative(process.cwd(), out)}  (${style}, ${files.size} files)`);
}

/* ---------- Theme Store submission: pre-submission checks ---------- */
const problems = [];
const branded = new Set();
for (const rel of listFiles(path.join(THEME, 'assets'))) {
  const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(THEME, 'assets', rel))).digest('hex');
  if (BRANDED_ASSETS[hash]) branded.add(BRANDED_ASSETS[hash]);
}
for (const name of branded) {
  problems.push(`assets/${name}-*.webp montre encore l'enseigne BOO SHOP : remplacer par une image sans texte ni marque.`);
}
const themeInfo = JSON.parse(fs.readFileSync(path.join(THEME, 'config/settings_schema.json'), 'utf8'))[0];
if (!themeInfo.theme_documentation_url || themeInfo.theme_documentation_url.includes('help.shopify.com')) {
  problems.push('config/settings_schema.json : theme_documentation_url doit pointer vers ta propre documentation.');
}
if (!themeInfo.theme_support_email && !themeInfo.theme_support_url) {
  problems.push('config/settings_schema.json : ajouter theme_support_email ou theme_support_url.');
}

const submission = path.join(DIST, 'lanterne-theme-store.zip');
if (problems.length) {
  fs.rmSync(submission, { force: true });
  console.log('\nZip Theme Store NON fabriqué. À corriger avant la soumission :');
  for (const problem of problems) console.log(`  - ${problem}`);
} else {
  const files = themeFiles({ withListings: true });
  fs.writeFileSync(submission, zip(files));
  console.log(`\n${path.relative(process.cwd(), submission)}  (Theme Store, ${files.size} files)`);
}
