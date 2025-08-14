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

import * as Cometa from '../../src';
import { MemoryLeakDetector } from '../util/memory';

/* TESTS *********************************************************************/

describe('TxIn', () => {
  let detector: MemoryLeakDetector;

  beforeEach(() => {
    detector = new MemoryLeakDetector(Cometa.getModule());
    detector.start();
  });

  afterEach(() => {
    detector.stop();
    detector.detect();
  });

  beforeAll(async () => {
    await Cometa.ready();
  });

  describe('readTxIn', () => {
    it('should read a valid readTxIn value', () => {
      const txIn = {
        index: 42,
        txId: 'a1b2c3d4e5f60708090a0b0c0d0e0f1011121314151617181920212223242526'
      };

      const ptr = Cometa.writeTxIn(txIn);
      expect(Cometa.readTxIn(ptr)).toEqual(txIn);
      Cometa.unrefObject(ptr);
    });

    it('should throw an error for null pointer', () => {
      expect(() => Cometa.readTxIn(0)).toThrow('Pointer is null');
    });
  });
});
