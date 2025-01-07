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

/* DEFINITIONS ****************************************************************/

/**
 * Generates a random 32-bit unsigned integer.
 */
export const getRandomValue = (): number => {
  // Prefer browser crypto if available
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const buf = new Uint8Array(4);
    window.crypto.getRandomValues(buf);
    return ((buf[0] << 24) | (buf[1] << 16) | (buf[2] << 8) | buf[3]) >>> 0;
  }

  // Otherwise, assume Node and do a dynamic require
  // (avoid direct require('crypto') so bundlers won't break for browsers)
  // eslint-disable-next-line no-eval
  const nodeCrypto = eval('require')('crypto');
  const buf = nodeCrypto.randomBytes(4);
  return ((buf[0] << 24) | (buf[1] << 16) | (buf[2] << 8) | buf[3]) >>> 0;
};

/**
 * Ensure the module has a getRandomValue function.
 */
export const ensureModuleHasRandomValue = (moduleInst: any) => {
  if (typeof moduleInst.getRandomValue === 'undefined') {
    moduleInst.getRandomValue = getRandomValue;
  }
};
