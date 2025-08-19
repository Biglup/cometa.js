/* eslint-disable no-console, unicorn/no-process-exit */
/**
 * Copyright 2025 Biglup Labs.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* IMPORTS ********************************************************************/

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

/* DEFINITIONS ****************************************************************/

const DIRS_TO_SCAN = ['./src', './test'];
const EM_GLUE_FILE = './libcardano-c/cardano_c_compressed.js'

const originalFile = './libcardano-c/cardano_c.js';

console.log(`Optimizing WASM in: ${EM_GLUE_FILE}`);

if (fsSync.existsSync(EM_GLUE_FILE)) {
  fsSync.unlinkSync(EM_GLUE_FILE);
  console.log(`Deleted existing file: ${EM_GLUE_FILE}`);
}

fsSync.copyFileSync(originalFile, EM_GLUE_FILE);

async function findUsedSymbols(dir, allSymbols) {
  const usedSymbols = new Set();
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const found = await findUsedSymbols(fullPath, allSymbols);
        found.forEach(s => usedSymbols.add(s));
      } else if (entry.isFile() && (fullPath.endsWith('.ts') || fullPath.endsWith('.js'))) {
        const content = await fs.readFile(fullPath, 'utf8');
        for (const symbol of allSymbols) {
          // Finds usage like `module.symbolName` or `getModule().symbolName`
          const usageRegex = new RegExp(`\\.${symbol}\\b`);
          if (usageRegex.test(content)) {
            usedSymbols.add(symbol);
          }
        }
      }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
  return usedSymbols;
}

async function run() {
  console.log('Tree-shaking Emscripten JS bindings...');

  let content = await fs.readFile(EM_GLUE_FILE, 'utf8');
  const allSymbols = new Set();
  const symbolRegex = /var\s+([a-zA-Z0-9_]+)=Module\["\1"\]/g;
  for (const match of content.matchAll(symbolRegex)) {
    allSymbols.add(match[1]);
  }
  console.log(`Found ${allSymbols.size} total symbols in the glue file.`);

  const usedSymbols = new Set();
  for (const dir of DIRS_TO_SCAN) {
    console.log(`Scanning directory for symbol usage: ${dir}`);
    const symbolsInDir = await findUsedSymbols(dir, allSymbols);
    symbolsInDir.forEach(s => usedSymbols.add(s));
  }

  console.log(`Found ${usedSymbols.size} symbols used in the codebase.`);

  const unusedSymbols = new Set([...allSymbols].filter(s => !usedSymbols.has(s)));
  console.log(`Removing ${unusedSymbols.size} unused symbols...`);

  let removedCount = 0;
  for (const symbol of unusedSymbols) {
    const removalRegex = new RegExp(`var\\s+${symbol}=Module\\["${symbol}"\\]=.+?;`, 'g');
    if (content.match(removalRegex)) {
      content = content.replace(removalRegex, '');
      removedCount++;
    }
  }

  content = content.replace(/(\r?\n){3,}/g, '\n\n');
  await fs.writeFile(EM_GLUE_FILE, content);
  console.log(`Successfully removed ${removedCount} symbol definitions.`);
}

run().catch(console.error);