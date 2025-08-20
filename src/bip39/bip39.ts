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

import { assertSuccess, writeBytesToMemory, writeStringToMemory } from '../marshaling';
import { getModule } from '../module';

/* DEFINITIONS ****************************************************************/

/**
 * Converts entropy (a byte array) into a BIP-39 mnemonic word list.
 *
 * @param {Uint8Array} entropy - The entropy bytes. Must be 16, 20, 24, 28, or 32 bytes in length.
 * @returns {string[]} An array of mnemonic words.
 * @throws {Error} If the entropy size is invalid or the conversion fails.
 */
export const entropyToMnemonic = (entropy: Uint8Array): string[] => {
  const module = getModule();
  const entropyPtr = writeBytesToMemory(entropy);
  const wordsArrayPtr = module._malloc(24 * 4);
  const wordCountPtr = module._malloc(4);

  try {
    const result = module.bip39_entropy_to_mnemonic_words(entropyPtr, entropy.length, wordsArrayPtr, wordCountPtr);

    assertSuccess(result, 'Failed to convert entropy to mnemonic');

    const wordCount = module.getValue(wordCountPtr, 'i32');
    const mnemonic: string[] = [];

    for (let i = 0; i < wordCount; i++) {
      const wordPtr = module.getValue(wordsArrayPtr + i * 4, 'i32');
      mnemonic.push(module.UTF8ToString(wordPtr));
    }

    return mnemonic;
  } finally {
    module._free(entropyPtr);
    module._free(wordsArrayPtr);
    module._free(wordCountPtr);
  }
};

/**
 * Converts a BIP-39 mnemonic word list back into its original entropy.
 *
 * @param {string[]} mnemonic - An array of 12, 15, 18, 21, or 24 mnemonic words.
 * @returns {Uint8Array} The corresponding entropy as a byte array.
 * @throws {Error} If the mnemonic is invalid or the conversion fails.
 */
export const mnemonicToEntropy = (mnemonic: string[]): Uint8Array => {
  const module = getModule();
  const wordCount = mnemonic.length;
  const wordPointers: number[] = [];

  const wordsArrayPtr = module._malloc(wordCount * 4);
  const entropyBufferPtr = module._malloc(64);
  const entropySizePtr = module._malloc(4);
  let actualEntropySize = 0;

  try {
    for (let i = 0; i < wordCount; i++) {
      const wordPtr = writeStringToMemory(mnemonic[i]);
      wordPointers.push(wordPtr);
      module.setValue(wordsArrayPtr + i * 4, wordPtr, 'i32');
    }

    const result = module.bip39_mnemonic_words_to_entropy(
      wordsArrayPtr,
      wordCount,
      entropyBufferPtr,
      64,
      entropySizePtr
    );
    assertSuccess(result, 'Failed to convert mnemonic to entropy');

    actualEntropySize = module.getValue(entropySizePtr, 'i32');

    return new Uint8Array(module.HEAPU8.subarray(entropyBufferPtr, entropyBufferPtr + actualEntropySize));
  } finally {
    for (const ptr of wordPointers) {
      module._free(ptr);
    }
    module._free(wordsArrayPtr);

    if (entropyBufferPtr && actualEntropySize > 0) {
      module.HEAPU8.fill(0, entropyBufferPtr, entropyBufferPtr + actualEntropySize);
    }

    module._free(entropySizePtr);
  }
};
