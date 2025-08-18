/* eslint-disable sort-keys-fix/sort-keys-fix */
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

import * as Cometa from '../../dist/cjs';
import { MemoryLeakDetector } from '../util/memory';

/* TESTS *********************************************************************/

describe('Value', () => {
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

  describe('valueTxIn', () => {
    it('should read a valid valueTxIn value', () => {
      const value = {
        assets: {
          '0000000000000000000000000000000000000000000000000000000030313232': 100n,
          '0000000000000000000000000000000000000000000000000000000033343536': 99n,
          '0000000000000000000000000000000000000000000000000000000040414242': 10n,
          '1111111111111111111111111111111111111111111111111111111140414242': 10n,
          '1111111111111111111111111111111111111111111111111111111130313232': 100n
        },
        coins: 1_000_000n
      };

      const ptr = Cometa.writeValue(value);
      expect(Cometa.readValue(ptr)).toEqual(value);
      Cometa.unrefObject(ptr);
    });

    it('should read a valid valueTxIn value - unsorted', () => {
      const value = {
        assets: {
          '1111111111111111111111111111111111111111111111111111111140414242': 100n,
          '0000000000000000000000000000000000000000000000000000000030313232': 99n,
          '1111111111111111111111111111111111111111111111111111111133343536': 10n,
          '0000000000000000000000000000000000000000000000000000000040414242': 10n,
          '1111111111111111111111111111111111111111111111111111111130313232': 100n,
          '0000000000000000000000000000000000000000000000000000000033343536': 100n
        },
        coins: 1_000_000n
      };

      const ptr = Cometa.writeValue(value);
      expect(Cometa.readValue(ptr)).toEqual(value);
      Cometa.unrefObject(ptr);
    });

    it('should read a valid valueTxIn value - max/min int64', () => {
      const MAX_INT_64 = 9223372036854775807n;
      const MIN_INT_64 = -9223372036854775808n;

      const value = {
        assets: {
          '1111111111111111111111111111111111111111111111111111111140414242': MAX_INT_64,
          '0000000000000000000000000000000000000000000000000000000030313232': MIN_INT_64,
          '1111111111111111111111111111111111111111111111111111111133343536': MAX_INT_64,
          '0000000000000000000000000000000000000000000000000000000040414242': MIN_INT_64,
          '1111111111111111111111111111111111111111111111111111111130313232': MAX_INT_64,
          '0000000000000000000000000000000000000000000000000000000033343536': MIN_INT_64
        },
        coins: MAX_INT_64
      };

      const ptr = Cometa.writeValue(value);
      expect(Cometa.readValue(ptr)).toEqual(value);
      Cometa.unrefObject(ptr);
    });

    it('should throw an error for null pointer', () => {
      expect(() => Cometa.readValue(0)).toThrow('Pointer is null');
    });
  });
});
