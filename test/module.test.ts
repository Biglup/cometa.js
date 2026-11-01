/**
 * Copyright 2024 Biglup Labs.
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

/* IMPORTS *******************************************************************/

import { spawnSync } from 'child_process';
import { resolve } from 'path';

/* TESTS **********************************************************************/

describe('distribution initialization', () => {
  const cjs = JSON.stringify(resolve('dist/cjs/index.js'));
  const esm = JSON.stringify(`file://${resolve('dist/esm/index.js')}`);
  const iife = JSON.stringify(resolve('dist/iife/index.global.js'));
  const check = `
    await Promise.all([api.ready(), api.ready()]);
    if (api.getLibCardanoCVersion() !== '2.0.0-rc.6') throw new Error('Wrong native release');
    if (typeof api.SubTransactionBuilder !== 'function') throw new Error('Missing builder');
    const random = api.getModule().getRandomValue();
    if (!Number.isInteger(random) || random < 0 || random > 0xffffffff) throw new Error('Invalid randomness');
  `;

  test.each([
    ['CJS', `const api = require(${cjs});`],
    // Exercise the fallback used on Node versions without global Web Crypto.
    ['ESM', `delete globalThis.crypto; const api = await import(${esm});`],
    [
      'IIFE',
      `
      const vm = require('vm');
      const fs = require('fs');
      const context = vm.createContext({
        console, WebAssembly, TextDecoder, TextEncoder, Uint8Array, ArrayBuffer,
        Buffer, setTimeout, clearTimeout, atob, btoa,
        crypto: require('crypto').webcrypto
      });
      vm.runInContext(fs.readFileSync(${iife}, 'utf8'), context);
      const api = context.Cometa;
    `
    ]
  ])('%s initializes with secure randomness', (_name, setup) => {
    const result = spawnSync(
      process.execPath,
      [
        ...(_name === 'ESM' ? ['--input-type=module'] : []),
        '-e',
        `(async () => { ${setup} ${check} })().catch(error => { console.error(error); process.exitCode = 1; });`
      ],
      { encoding: 'utf8' }
    );
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });
});
