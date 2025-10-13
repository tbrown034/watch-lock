#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');
const readline = require('readline');

const IGNORED_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'build', '.turbo']);
const TARGET_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.md', '.mdx', '.txt']);

async function collectFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...await collectFiles(fullPath));
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (TARGET_EXTS.has(ext)) {
      files.push(fullPath);
    }
  }

  return files;
}

function findOxfordCommas(content) {
  const matches = [];
  const regex = /,\s+(and|or)\s+(?=[A-Za-z0-9"'`])/gi;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const commaIndex = match.index;
    const precedingChar = content[commaIndex - 1] || '';

    if (!/[A-Za-z0-9"'`)]/.test(precedingChar)) {
      continue;
    }

    matches.push({
      index: commaIndex,
      length: match[0].length,
      conjunction: match[1],
    });
  }

  return matches;
}

function getLineInfo(content, index) {
  const lines = content.slice(0, index).split('\n');
  const lineNumber = lines.length;
  const column = lines[lines.length - 1].length + 1;
  const lineText = content.split('\n')[lineNumber - 1] ?? '';

  return { lineNumber, column, lineText };
}

function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function askYesNo(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      const normalized = answer.trim().toLowerCase();
      resolve(normalized === 'y' || normalized === 'yes');
    });
  });
}

async function processFile(rl, filePath) {
  const originalContent = await fs.readFile(filePath, 'utf8');
  const matches = findOxfordCommas(originalContent);

  if (matches.length === 0) {
    return false;
  }

  let updatedContent = originalContent;
  let shift = 0;
  let hasChanges = false;

  for (const match of matches) {
    const { lineNumber, column, lineText } = getLineInfo(originalContent, match.index);
    const pointerLine = `${' '.repeat(column - 1)}^`;

    console.log(`\n${path.relative(process.cwd(), filePath)}:${lineNumber}:${column}`);
    console.log(lineText);
    console.log(pointerLine);

    const shouldRemove = await askYesNo(rl, 'Remove this Oxford comma? [y/N] ');
    if (!shouldRemove) {
      continue;
    }

    const removalIndex = match.index - shift;
    updatedContent = updatedContent.slice(0, removalIndex) + updatedContent.slice(removalIndex + 1);
    shift += 1;
    hasChanges = true;
    console.log('Comma removed.');
  }

  if (hasChanges) {
    await fs.writeFile(filePath, updatedContent, 'utf8');
  }

  return hasChanges;
}

async function main() {
  const projectRoot = process.cwd();
  const files = await collectFiles(projectRoot);

  if (files.length === 0) {
    console.log('No target files to inspect.');
    return;
  }

  console.log(`Scanning ${files.length} files for Oxford commas...\n`);

  const rl = createInterface();
  let changedFiles = 0;

  try {
    for (const file of files) {
      const changed = await processFile(rl, file);
      if (changed) {
        changedFiles += 1;
      }
    }
  } finally {
    rl.close();
  }

  if (changedFiles === 0) {
    console.log('\nNo Oxford commas were removed.');
  } else {
    console.log(`\nRemoved Oxford commas in ${changedFiles} file(s).`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
