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
import path from 'path';

/* DEFINITIONS ****************************************************************/

const distDir = './dist';

const commentBlockRegex = /\/\*\*[\s\S]*?\*\//g;

async function cleanFile(filePath) {
  try {
    let content = await fs.readFile(filePath, 'utf8');
    const originalLength = content.length;

    const cleanedContent = content.replace(commentBlockRegex, (commentBlock) => {
      if (commentBlock.includes('Copyright') && commentBlock.includes('Licensed under the Apache License')) {
        return '';
      }

      return commentBlock;
    });

    const finalContent = cleanedContent.replace(/(\r?\n){3,}/g, '\n\n');

    if (finalContent.length < originalLength) {
      await fs.writeFile(filePath, finalContent, 'utf8');
      console.log(`Cleaned copyright header(s) from: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error cleaning file ${filePath}:`, error);
  }
}

async function findAndCleanDtsFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await findAndCleanDtsFiles(fullPath);
    } else if (entry.isFile() && (fullPath.endsWith('.d.ts') || fullPath.endsWith('.d.mts'))) {
      await cleanFile(fullPath);
    }
  }
}

console.log('Cleaning copyright headers from declaration files...');
findAndCleanDtsFiles(distDir).then(() => {
  console.log('Cleanup complete.');
});