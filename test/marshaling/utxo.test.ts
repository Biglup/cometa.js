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

/* IMPORTS *******************************************************************/

import * as Cometa from '../../dist/cjs';
import { MemoryLeakDetector } from '../util/memory';

/* TESTS *********************************************************************/

describe('UTxO Serialization', () => {
  const SAMPLE_UTXO_1: Cometa.UTxO = {
    input: {
      index: 0,
      txId: '0000000000000000000000000000000000000000000000000000000000000001'
    },
    output: {
      address:
        'addr_test1zrphkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gten0d3vllmyqwsx5wktcd8cc3sq835lu7drv2xwl2wywfgsxj90mg',
      value: { coins: 1000000n }
    }
  };

  const SAMPLE_UTXO_2: Cometa.UTxO = {
    input: {
      index: 1,
      txId: '0000000000000000000000000000000000000000000000000000000000000002'
    },
    output: {
      address:
        'addr_test1zrphkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gten0d3vllmyqwsx5wktcd8cc3sq835lu7drv2xwl2wywfgsxj90mg',
      value: {
        assets: {
          e1b8b580951c6c97ac1b62e4c2787de794611ce5179261a2f447228854657374436f696e: 99n
        },
        coins: 5000000n
      }
    }
  };

  let detector: MemoryLeakDetector;

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

  describe('Single UTxO', () => {
    it('should correctly write and read a single UTxO', () => {
      const originalUtxo = SAMPLE_UTXO_1;
      let utxoPtr = 0;

      try {
        utxoPtr = Cometa.writeUtxo(originalUtxo);
        expect(utxoPtr).not.toBe(0);
        const readUtxo = Cometa.readUtxo(utxoPtr);

        expect(readUtxo).toEqual(originalUtxo);
      } finally {
        if (utxoPtr !== 0) {
          Cometa.unrefObject(utxoPtr);
        }
      }
    });

    it('readUtxo should throw an error for a null pointer', () => {
      expect(() => Cometa.readUtxo(0)).toThrow('Pointer to UTxO is null');
    });
  });

  describe('UTxO List', () => {
    it('should correctly write and read a list of multiple UTxOs', () => {
      const originalUtxoList = [SAMPLE_UTXO_1, SAMPLE_UTXO_2];
      let listPtr = 0;

      try {
        // Act
        listPtr = Cometa.writeUtxoList(originalUtxoList);
        expect(listPtr).not.toBe(0);
        const readUtxoList = Cometa.readUtxoList(listPtr);

        // Assert
        expect(readUtxoList).toEqual(originalUtxoList);
      } finally {
        // Cleanup
        if (listPtr !== 0) {
          Cometa.unrefObject(listPtr);
        }
      }
    });

    it('should correctly handle an empty list', () => {
      const originalUtxoList: Cometa.UTxO[] = [];
      let listPtr = 0;

      try {
        // Act
        listPtr = Cometa.writeUtxoList(originalUtxoList);
        expect(listPtr).not.toBe(0);
        const readUtxoList = Cometa.readUtxoList(listPtr);

        // Assert
        expect(readUtxoList).toEqual([]);
      } finally {
        // Cleanup
        if (listPtr !== 0) {
          Cometa.unrefObject(listPtr);
        }
      }
    });

    it('readUtxoList should return an empty array for a null pointer', () => {
      const result = Cometa.readUtxoList(0);
      expect(result).toEqual([]);
    });
  });
});
