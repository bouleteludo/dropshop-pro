#!/usr/bin/env node
// Packages every theme in shopify/themes for Shopify.
//
//   node shopify/scripts/package-themes.mjs            all themes
//   node shopify/scripts/package-themes.mjs lanterne   one theme
//
// Outputs, in shopify/dist:
//   demo/<theme>.zip          upload it to the theme's demo store
//   theme-store/<theme>.zip   the Theme Store submission, only built once the
//                             pre-submission checks below pass
//
// No dependencies: Node 22+ (zlib.crc32).

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const THEMES = path.join(ROOT, 'themes');
const DIST = path.join(ROOT, 'dist');
const THEME_DIRS = ['assets', 'blocks', 'config', 'layout', 'locales', 'sections', 'snippets', 'templates'];

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

function listFiles(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full, base) : [path.relative(base, full).split(path.sep).join('/')];
  });
}

function themeFiles(themeDir) {
  const files = new Map();
  for (const dir of [...THEME_DIRS, 'listings']) {
    for (const rel of listFiles(path.join(themeDir, dir))) {
      files.set(`${dir}/${rel}`, fs.readFileSync(path.join(themeDir, dir, rel)));
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

function submissionProblems(themeDir, files) {
  const problems = [];
  const branded = new Set();
  for (const [name, data] of files) {
    if (!name.startsWith('assets/')) continue;
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    if (BRANDED_ASSETS[hash]) branded.add(BRANDED_ASSETS[hash]);
  }
  for (const name of branded) {
    problems.push(`assets/${name}-*.webp montre encore l'enseigne BOO SHOP : remplacer par une image sans texte ni marque.`);
  }
  const themeInfo = JSON.parse(fs.readFileSync(path.join(themeDir, 'config/settings_schema.json'), 'utf8'))[0];
  if (!themeInfo.theme_documentation_url || themeInfo.theme_documentation_url.includes('help.shopify.com')) {
    problems.push('config/settings_schema.json : theme_documentation_url doit pointer vers ta propre documentation.');
  }
  if (!themeInfo.theme_support_email && !themeInfo.theme_support_url) {
    problems.push('config/settings_schema.json : ajouter theme_support_email ou theme_support_url.');
  }
  return problems;
}

const only = process.argv[2];
const themes = fs.readdirSync(THEMES).filter((name) => fs.existsSync(path.join(THEMES, name, 'layout/theme.liquid')) && (!only || name === only));
if (!themes.length) throw new Error(only ? `Theme "${only}" not found in ${THEMES}` : `No theme in ${THEMES}`);

fs.mkdirSync(path.join(DIST, 'demo'), { recursive: true });
fs.mkdirSync(path.join(DIST, 'theme-store'), { recursive: true });

for (const theme of themes) {
  const themeDir = path.join(THEMES, theme);
  const files = themeFiles(themeDir);
  const archive = zip(files);

  const demo = path.join(DIST, 'demo', `${theme}.zip`);
  fs.writeFileSync(demo, archive);
  console.log(`${path.relative(process.cwd(), demo)}  (${files.size} files)`);

  const submission = path.join(DIST, 'theme-store', `${theme}.zip`);
  const problems = submissionProblems(themeDir, files);
  if (problems.length) {
    fs.rmSync(submission, { force: true });
    console.log(`  Zip Theme Store de « ${theme} » NON fabriqué. À corriger avant la soumission :`);
    for (const problem of problems) console.log(`    - ${problem}`);
  } else {
    fs.writeFileSync(submission, archive);
    console.log(`  ${path.relative(process.cwd(), submission)}  (prêt pour la soumission)`);
  }
}
