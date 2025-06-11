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

import { getModule } from '../module';

/* DEFINITIONS ****************************************************************/

const registry = new Map<number, any>();

export const register = (id: number, obj: any) => registry.set(id, obj);
export const unregister = (id: number) => registry.delete(id);

/** read UTF-8 string (ptr,len) from WASM heap */
export const readStr = (ptr: number, len: number) => getModule().UTF8ToString(ptr, len);

/** write a pointer result into *outPtr */
export const writePtr = (outPtr: number, ptr: number) => getModule().setValue(outPtr, ptr, '*');

export type Decoder = (rawArgs: any[]) => any[];
export type Encoder = (result: any, rawArgs: any[]) => number;

/** One entry per C import you listed in ASYNCIFY_IMPORTS */
export interface ImportSpec {
  cName: string;
  jsMethod: string;
  decode?: Decoder;
  encode?: Encoder;
}

/**
 * Build an object whose keys are the import names and whose values are
 * Promise-returning wrappers. Pass this object into `ModuleFactory`
 * (either directly or inside the `env` import namespace) *before* the
 * WASM module is instantiated.
 *
 * Each wrapper does:
 *  1. Look up JS instance from `registry` using `objectId` (arg 0)
 *  2. Optionally `decode` arguments
 *  3. Call `instance[jsMethod](...)` – must return Promise
 *  4. Optionally `encode` the resolved value into WASM and
 *     return an int error code (0 = success, non-zero = error)
 */
export const buildTrampolines = (specs: ImportSpec[]): Record<string, any> => {
  const trampolines: Record<string, any> = {};

  for (const s of specs) {
    trampolines[s.cName] = (...raw: any[]) => {
      // eslint-disable-next-line consistent-this
      const self = registry.get(raw[0]);
      if (!self || typeof self[s.jsMethod] !== 'function') {
        return Promise.resolve(-1);
      }

      const jsArgs = s.decode ? s.decode(raw) : raw;
      return (self[s.jsMethod] as any)(...jsArgs.slice(1))
        .then((res: any) => (s.encode ? s.encode(res, raw) : 0))
        .catch(() => -1);
    };
  }
  return trampolines;
};
