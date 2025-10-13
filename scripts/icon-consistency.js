#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');
const readline = require('readline');

const IGNORED_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'build', '.turbo']);
const TARGET_EXTS = new Set(['.tsx', '.jsx']);

function rlInterface() {
  return readline.createInterface({ input: process.stdin, output: process.stdout });
}

function ask(rl, q) {
  return new Promise((res) => rl.question(q, (a) => res(a.trim().toLowerCase())));
}

async function collectFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    if (IGNORED_DIRS.has(e.name)) continue;
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...(await collectFiles(fp)));
    } else if (TARGET_EXTS.has(path.extname(e.name))) {
      out.push(fp);
    }
  }
  return out;
}

// Very lightweight import parser to find lucide-react component names
function getLucideImports(src) {
  const imports = new Set();
  const importRegex = /import\s*{([^}]+)}\s*from\s*['"]lucide-react['"]/g;
  let m;
  while ((m = importRegex.exec(src))) {
    const names = m[1].split(',').map((s) => s.trim().split(' as ')[0].trim()).filter(Boolean);
    for (const n of names) imports.add(n);
  }
  return imports;
}

// Find JSX icon usages like <Icon .../> or <Icon ...></Icon>
function findIconUsages(src, iconNames) {
  const usages = [];
  for (const name of iconNames) {
    const tagRegex = new RegExp(`<${name}(\s[^>]*?)?(\/?>)`, 'g');
    let m;
    while ((m = tagRegex.exec(src))) {
      usages.push({ name, index: m.index, match: m[0] });
    }
  }
  usages.sort((a, b) => a.index - b.index);
  return usages;
}

function getLineInfo(content, index) {
  const before = content.slice(0, index);
  const lines = before.split('\n');
  const lineNumber = lines.length;
  const column = lines[lines.length - 1].length + 1;
  const lineText = content.split('\n')[lineNumber - 1] ?? '';
  return { lineNumber, column, lineText };
}

// Heuristic: ensure aria-hidden on icon tags that are likely decorative
function ensureAriaHiddenOnTag(tag) {
  if (/aria-hidden\s*=/.test(tag)) return tag; // already has aria-hidden
  // insert aria-hidden="true" before closing of start tag
  return tag.replace(/^(<[^>]+?)(\/>|>)/, (m, start, end) => `${start} aria-hidden=\"true\"${end}`);
}

// Heuristic emoji regex (covers common ranges)
const EMOJI_REGEX = /[\u203C-\u3299\u1F000-\u1FAFF\u1F300-\u1F6FF\u1F900-\u1F9FF\u2600-\u27BF]/;

// Count icons inside a single control (button or link) on the same line for simplicity
function findControlsWithMultipleIcons(src, iconNames) {
  const lines = src.split('\n');
  const controls = [];
  const iconPattern = new RegExp(`<(?:${Array.from(iconNames).join('|')})(\s|>)`, 'g');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/(<a\b|<button\b)/.test(line)) continue;
    const matches = line.match(iconPattern);
    if (matches && matches.length > 1) {
      controls.push({ lineNumber: i + 1, lineText: line, iconCount: matches.length });
    }
  }
  return controls;
}

function findEmojiLines(src) {
  const out = [];
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (EMOJI_REGEX.test(lines[i])) {
      out.push({ lineNumber: i + 1, lineText: lines[i] });
    }
  }
  return out;
}

async function processFile(rl, filePath) {
  let content = await fs.readFile(filePath, 'utf8');
  const lucideNames = getLucideImports(content);
  if (lucideNames.size === 0) return false;

  let changed = false;

  // 1) Ensure aria-hidden on icon tags
  const usages = findIconUsages(content, lucideNames);
  for (const u of usages) {
    if (/aria-hidden\s*=/.test(u.match)) continue;
    const { lineNumber, column, lineText } = getLineInfo(content, u.index);
    console.log(`\n${path.relative(process.cwd(), filePath)}:${lineNumber}:${column}`);
    console.log(lineText);
    console.log('^ ensure aria-hidden on decorative icon');
    const a = await ask(rl, `Add aria-hidden to <${u.name}>? [y/N] `);
    if (a === 'y' || a === 'yes') {
      const updatedTag = ensureAriaHiddenOnTag(u.match);
      content = content.slice(0, u.index) + updatedTag + content.slice(u.index + u.match.length);
      changed = true;
    }
  }

  // 2) Warn if multiple icons in a single control line
  const multiIconControls = findControlsWithMultipleIcons(content, lucideNames);
  for (const c of multiIconControls) {
    console.log(`\n${path.relative(process.cwd(), filePath)}:${c.lineNumber}:1`);
    console.log(c.lineText);
    console.log(`^ found ${c.iconCount} icons in one control; recommend keeping only one at start`);
  }

  // 3) Warn on emoji presence in labels/lines
  const emojiLines = findEmojiLines(content);
  for (const e of emojiLines) {
    console.log(`\n${path.relative(process.cwd(), filePath)}:${e.lineNumber}:1`);
    console.log(e.lineText);
    console.log('^ emoji detected; prefer lucide icon + text, not emoji');
  }

  if (changed) {
    await fs.writeFile(filePath, content, 'utf8');
  }
  return changed;
}

async function main() {
  const root = process.cwd();
  const files = await collectFiles(root);
  if (files.length === 0) {
    console.log('No TSX/JSX files found.');
    return;
  }
  console.log(`Scanning ${files.length} files for icon consistency...`);
  const rl = rlInterface();
  let changedFiles = 0;
  try {
    for (const f of files) {
      const changed = await processFile(rl, f);
      if (changed) changedFiles += 1;
    }
  } finally {
    rl.close();
  }
  console.log(`\nDone. Updated ${changedFiles} file(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

