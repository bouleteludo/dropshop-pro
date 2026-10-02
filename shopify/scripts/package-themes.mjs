#!/usr/bin/env node
// Builds one ready-to-upload Shopify theme zip per season from shopify/theme.
//
//   node shopify/scripts/package-themes.mjs                → shopify/dist/boo-shop-<season>.zip
//   node shopify/scripts/package-themes.mjs --theme-store  → also shopify/dist/lanterne-theme-store.zip
//
// Each seasonal zip contains the whole theme with that season's preset applied
// (settings, home page, header and footer). The other presets stay available
// in the theme editor under Theme settings > Theme style.
// The Theme Store zip keeps the /listings folder required for a submission.
// No dependencies: Node 22+ (zlib.crc32).

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const THEME = path.join(ROOT, 'theme');
const DIST = path.join(ROOT, 'dist');
const THEME_DIRS = ['assets', 'blocks', 'config', 'layout', 'locales', 'sections', 'snippets', 'templates'];

// Preset name (config/settings_data.json) → zip name. The parent preset uses
// the root templates; the others override them from listings/<preset-slug>/.
const SEASONS = {
  Lanterne: 'boo-shop-halloween',
  Sapin: 'boo-shop-noel',
  Printemps: 'boo-shop-paques',
  Velours: 'boo-shop-saint-valentin',
  Rivage: 'boo-shop-ete',
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

fs.mkdirSync(DIST, { recursive: true });

for (const [preset, zipName] of Object.entries(SEASONS)) {
  if (!settings.presets[preset]) throw new Error(`Preset "${preset}" is missing from ${settingsPath}`);
  const files = themeFiles({ withListings: false });

  const listing = path.join(THEME, 'listings', kebab(preset));
  for (const rel of listFiles(listing)) {
    files.set(rel, fs.readFileSync(path.join(listing, rel)));
  }

  const seasonal = { ...settings, current: settings.presets[preset] };
  files.set(settingsPath, Buffer.from(`${settingsHeader}${JSON.stringify(seasonal, null, 2)}\n`));

  const out = path.join(DIST, `${zipName}.zip`);
  fs.writeFileSync(out, zip(files));
  console.log(`${path.relative(process.cwd(), out)}  (${preset}, ${files.size} files)`);
}

if (process.argv.includes('--theme-store')) {
  const files = themeFiles({ withListings: true });
  const out = path.join(DIST, 'lanterne-theme-store.zip');
  fs.writeFileSync(out, zip(files));
  console.log(`${path.relative(process.cwd(), out)}  (Theme Store structure, ${files.size} files)`);
}
