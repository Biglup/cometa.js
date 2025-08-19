/**
 * Copyright 2025 Biglup Labs.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* IMPORTS *******************************************************************/

import * as Cometa from '../../dist/cjs';
import { MemoryLeakDetector } from '../util/memory';

/* HELPER FUNCTIONS **********************************************************/

/**
 * Converts a hex string to a Uint8Array for test data.
 * @param {string} hex The hex string.
 * @returns {Uint8Array} The byte array.
 */
const hexToBytes = (hex: string): Uint8Array =>
  new Uint8Array(hex.match(/.{1,2}/g)!.map((byte) => Number.parseInt(byte, 16)));

/* TESTS *********************************************************************/

describe('BIP39 Mnemonics', () => {
  let detector: MemoryLeakDetector;

  // Standard BIP-39 Test Vectors
  const VECTOR_12_WORDS = {
    entropy: hexToBytes('7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f'),
    mnemonic: 'legal winner thank year wave sausage worth useful legal winner thank yellow'.split(' ')
  };

  const VECTOR_24_WORDS = {
    entropy: hexToBytes('ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'),
    mnemonic: 'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo vote'.split(
      ' '
    )
  };

  beforeAll(async () => {
    await Cometa.ready();
  });

  beforeEach(() => {
    detector = new MemoryLeakDetector(Cometa.getModule());
    detector.start();
  });

  afterEach(() => {
    detector.stop();
    detector.detect();
  });

  describe('entropyToMnemonic', () => {
    it('should convert 128-bit entropy to a 12-word mnemonic', () => {
      const result = Cometa.entropyToMnemonic(VECTOR_12_WORDS.entropy);
      expect(result).toEqual(VECTOR_12_WORDS.mnemonic);
    });

    it('should convert 256-bit entropy to a 24-word mnemonic', () => {
      const result = Cometa.entropyToMnemonic(VECTOR_24_WORDS.entropy);
      expect(result).toEqual(VECTOR_24_WORDS.mnemonic);
    });

    it('should throw an error for invalid entropy length', () => {
      const invalidEntropy = new Uint8Array(15); // Not a multiple of 4 bytes
      expect(() => Cometa.entropyToMnemonic(invalidEntropy)).toThrow();
    });
  });

  describe('mnemonicToEntropy', () => {
    it('should convert a 12-word mnemonic to 128-bit entropy', () => {
      const result = Cometa.mnemonicToEntropy(VECTOR_12_WORDS.mnemonic);
      expect(result).toEqual(VECTOR_12_WORDS.entropy);
    });

    it('should convert a 24-word mnemonic to 256-bit entropy', () => {
      const result = Cometa.mnemonicToEntropy(VECTOR_24_WORDS.mnemonic);
      expect(result).toEqual(VECTOR_24_WORDS.entropy);
    });

    it('should throw an error for an invalid word count', () => {
      const invalidMnemonic = ['abandon', 'abandon'];
      expect(() => Cometa.mnemonicToEntropy(invalidMnemonic)).toThrow();
    });

    it('should throw an error for a word not in the wordlist', () => {
      const invalidMnemonic = [...VECTOR_12_WORDS.mnemonic];
      invalidMnemonic[11] = 'typescript'; // Invalid word
      expect(() => Cometa.mnemonicToEntropy(invalidMnemonic)).toThrow();
    });
  });

  describe('Round Trip Conversion', () => {
    it('should return the original entropy after a round trip (128-bit)', () => {
      const originalEntropy = VECTOR_12_WORDS.entropy;
      const mnemonic = Cometa.entropyToMnemonic(originalEntropy);
      const finalEntropy = Cometa.mnemonicToEntropy(mnemonic);
      expect(finalEntropy).toEqual(originalEntropy);
    });

    it('should return the original entropy after a round trip (256-bit)', () => {
      const originalEntropy = VECTOR_24_WORDS.entropy;
      const mnemonic = Cometa.entropyToMnemonic(originalEntropy);
      const finalEntropy = Cometa.mnemonicToEntropy(mnemonic);
      expect(finalEntropy).toEqual(originalEntropy);
    });
  });
});
