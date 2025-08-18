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

import fs from 'fs';
import zlib from 'zlib';

/* DEFINITIONS ****************************************************************/

const filePath = './libcardano-c/cardano_c_compressed.js';
console.log(`Optimizing WASM in: ${filePath}`);

let content = fs.readFileSync(filePath, 'utf8');

const wasmRegex = /="data:application\/octet-stream;base64,([^"]+)"/;
const match = content.match(wasmRegex);

if (!match) {
  console.error('Could not find inlined WASM data URI.');
  process.exit(1);
}

const originalBase64 = match[1];
const wasmBytes = Buffer.from(originalBase64, 'base64');
const compressedBytes = zlib.gzipSync(wasmBytes, { level: 9 });
const compressedBase64 = compressedBytes.toString('base64');

console.log(`WASM size reduced from ${(wasmBytes.length / 1024).toFixed(2)} KB to ${(compressedBytes.length / 1024).toFixed(2)} KB`);

content = content.replace(wasmRegex, `=''`);

const exportSnippet = `\nmodule.exports.compressedWasmBase64 = '${compressedBase64}';\n`;
content += exportSnippet;

fs.writeFileSync(filePath, content);

console.log('Successfully compressed and attached WASM data to the module export.');