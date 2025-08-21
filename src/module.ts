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

import { Buffer } from 'buffer';
import { bridgeCallbacks } from './marshaling';
import { ensureModuleHasRandomValue } from './randomValue';
// eslint-disable-next-line import/no-extraneous-dependencies
import pako from 'pako';

/* GLOBALS ********************************************************************/

let _Module: any;
let _isReady = false;

/* DEFINITIONS ****************************************************************/

/**
 * Initializes the WASM module and ensures it is ready for use.
 *
 * This function dynamically imports the WASM module using Emscripten and sets up its initialization callbacks.
 * It returns a Promise that resolves once the module is fully initialized. If the module is already initialized,
 * the Promise resolves immediately.
 *
 * @returns {Promise<void>} A Promise that resolves when the WASM module is ready.
 */
export const ready = async (): Promise<void> => {
  if (_isReady) return;

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const EmscriptenModule = (await import('../libcardano-c/cardano_c_compressed.js')).default;
  const ModuleFactory = EmscriptenModule;

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const compressedWasmBase64 = EmscriptenModule.compressedWasmBase64;

  const compressedBytes = Buffer.from(compressedWasmBase64, 'base64');
  const decompressedWasmBinary = pako.inflate(compressedBytes);

  return new Promise<void>((resolve, reject) => {
    Object.assign(globalThis, bridgeCallbacks);

    const moduleInstance = ModuleFactory({
      onAbort: (err: unknown) => {
        reject(err);
      },
      onRuntimeInitialized: () => {
        _isReady = true;

        resolve();
      },
      wasmBinary: decompressedWasmBinary
    });

    moduleInstance
      .then((instance: any) => {
        _Module = instance;
        ensureModuleHasRandomValue(_Module);
      })
      .catch((error: any) => {
        reject(error);
      });
  });
};

/**
 * Retrieves the initialized Emscripten WASM module.
 *
 * This function returns the initialized Emscripten WASM module. If the module is not ready,
 * it throws an error. Ensure `ready()` has been called and resolved before using this function.
 *
 * @throws {Error} If the module is not ready.
 *
 * @returns {any} The initialized WASM module.
 */
export const getModule = (): any => {
  if (!_isReady) {
    throw new Error('Module is not ready yet. Make sure to call `await Cometa.ready()` first.');
  }
  return _Module;
};

/**
 * Checks if the WASM module is ready for use.
 *
 * This function provides a synchronous way to check if the WASM module has been initialized.
 * It is useful to verify the readiness state before calling `getModule()`.
 *
 * @returns {boolean} `true` if the module is ready, otherwise `false`.
 */
export const isReady = (): boolean => _isReady;
