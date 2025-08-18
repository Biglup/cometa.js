/**
 * Copyright 2025 Biglup Labs.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may not use this file except in compliance with the License.
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

/* TESTS *********************************************************************/

describe('WithdrawalMap', () => {
  let detector: MemoryLeakDetector;

  const withdrawals1: Cometa.Withdrawals = {
    stake1uyehkck0lajq8gr28t9uxnuvgcqrc6070x3k9r8048z8y5gh6ffgw: 2500000n,
    stake178phkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gtcccycj5: 1000000n
  };

  const withdrawals2: Cometa.Withdrawals = {
    stake178phkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gtcccycj5: 999999999999999999n
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

  it('should correctly write and read a map with multiple entries', () => {
    const ptr = Cometa.writeWithdrawalMap(withdrawals1);
    try {
      const readMap = Cometa.readWithdrawalMap(ptr);
      expect(readMap).toEqual(withdrawals1);
    } finally {
      Cometa.unrefObject(ptr);
    }
  });

  it('should correctly handle an empty withdrawal map', () => {
    const emptyWithdrawals: Cometa.Withdrawals = {};
    const ptr = Cometa.writeWithdrawalMap(emptyWithdrawals);
    try {
      const readMap = Cometa.readWithdrawalMap(ptr);
      expect(readMap).toEqual({});
    } finally {
      Cometa.unrefObject(ptr);
    }
  });

  it('should correctly handle a map with large bigint values', () => {
    const ptr = Cometa.writeWithdrawalMap(withdrawals2);
    try {
      const readMap = Cometa.readWithdrawalMap(ptr);
      expect(readMap).toEqual(withdrawals2);
    } finally {
      Cometa.unrefObject(ptr);
    }
  });

  describe('Memory Management', () => {
    it('should not leak memory when processing various maps', () => {
      const mapsToTest = [withdrawals1, withdrawals2, {}];

      for (const map of mapsToTest) {
        const ptr = Cometa.writeWithdrawalMap(map);
        const readMap = Cometa.readWithdrawalMap(ptr);
        expect(readMap).toEqual(map);
        Cometa.unrefObject(ptr);
      }
    });
  });
});
