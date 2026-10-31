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
import ts from 'typescript';

/* DEFINITIONS ****************************************************************/

const DIRS_TO_SCAN = ['./src', './test'];
const EM_GLUE_FILE = './libcardano-c/cardano_c_compressed.js';

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
        found.forEach((s) => usedSymbols.add(s));
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
  const parsed = ts.createSourceFile(EM_GLUE_FILE, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const wrappers = new Map();
  const visit = (statement) => {
    ts.forEachChild(statement, visit);
    if (!ts.isVariableStatement(statement) || statement.declarationList.declarations.length !== 1) return;
    const declaration = statement.declarationList.declarations[0];
    if (!ts.isIdentifier(declaration.name) || !declaration.initializer) return;
    const name = declaration.name.text;
    const initializer = declaration.initializer;
    if (!ts.isBinaryExpression(initializer) || initializer.operatorToken.kind !== ts.SyntaxKind.EqualsToken) return;
    const target = initializer.left;
    if (
      ts.isElementAccessExpression(target) &&
      /^Module\d*$/.test(target.expression.getText(parsed)) &&
      target.argumentExpression &&
      ts.isStringLiteral(target.argumentExpression) &&
      target.argumentExpression.text === name
    ) {
      wrappers.set(name, statement);
    }
  };
  visit(parsed);
  const allSymbols = new Set(wrappers.keys());
  if (allSymbols.size === 0) throw new Error('No Emscripten export wrappers found; refusing to skip pruning.');
  console.log(`Found ${allSymbols.size} total symbols in the glue file.`);

  // Runtime exports (including Asyncify) can be called by the generated glue itself.
  const usedSymbols = new Set([...allSymbols].filter((symbol) => symbol.startsWith('_')));
  for (const dir of DIRS_TO_SCAN) {
    console.log(`Scanning directory for symbol usage: ${dir}`);
    const symbolsInDir = await findUsedSymbols(dir, allSymbols);
    symbolsInDir.forEach((s) => usedSymbols.add(s));
  }

  console.log(`Found ${usedSymbols.size} symbols used in the codebase.`);

  const unusedSymbols = new Set([...allSymbols].filter((s) => !usedSymbols.has(s)));
  console.log(`Removing ${unusedSymbols.size} unused symbols...`);

  const removals = [...unusedSymbols]
    .map((symbol) => wrappers.get(symbol))
    .sort((a, b) => b.getStart(parsed) - a.getStart(parsed));
  for (const statement of removals) {
    content = content.slice(0, statement.getStart(parsed)) + content.slice(statement.end);
  }
  const removedCount = removals.length;

  content = content.replace(/(\r?\n){3,}/g, '\n\n');
  await fs.writeFile(EM_GLUE_FILE, content);
  console.log(`Successfully removed ${removedCount} symbol definitions.`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
