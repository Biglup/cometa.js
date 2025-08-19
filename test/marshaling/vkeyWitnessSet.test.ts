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

/* TESTS *********************************************************************/

describe('VkeyWitnessSet', () => {
  let detector: MemoryLeakDetector;

  const WITNESS_1: Cometa.VkeyWitness = {
    signature:
      '2fa3f686df876995167e7c2e5d74c4c7b6e48f8068fe0e44208344d480f7904c36963e44115fe3eb2a3ac8694c28bcb4f5a0f3276f2e79487d8219057a506e4b',
    vkey: '2fa3f686df876995167e7c2e5d74c4c7b6e48f8068fe0e44208344d480f7904c'
  };

  const WITNESS_2: Cometa.VkeyWitness = {
    signature:
      '2fa3f686df876995167e7c2e5d74c4c7b6e48f8068fe0e44208344d480f7904c36963e44115fe3eb2a3ac8694c28bcb4f5a0f3276f2e79487d8219057a506e42',
    vkey: '2fa3f686df876995167e7c2e5d74c4c7b6e48f8068fe0e44208344d480f79042'
  };

  const VALID_VKEY_WITNESS_SET: Cometa.VkeyWitnessSet = [WITNESS_1, WITNESS_2];

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

  describe('writeVkeyWitnessSet & readVkeyWitnessSet', () => {
    it('should correctly write and read a set with multiple entries', () => {
      const ptr = Cometa.writeVkeyWitnessSet(VALID_VKEY_WITNESS_SET);
      try {
        const readSet = Cometa.readVkeyWitnessSet(ptr);
        expect(new Set(readSet)).toEqual(new Set(VALID_VKEY_WITNESS_SET));
      } finally {
        Cometa.unrefObject(ptr);
      }
    });

    it('should correctly handle an empty set', () => {
      const ptr = Cometa.writeVkeyWitnessSet([]);
      try {
        const readSet = Cometa.readVkeyWitnessSet(ptr);
        expect(readSet).toEqual([]);
      } finally {
        Cometa.unrefObject(ptr);
      }
    });

    it('should handle a set with a single entry', () => {
      const singleEntrySet = [WITNESS_1];
      const ptr = Cometa.writeVkeyWitnessSet(singleEntrySet);
      try {
        const readSet = Cometa.readVkeyWitnessSet(ptr);
        expect(readSet).toEqual(singleEntrySet);
      } finally {
        Cometa.unrefObject(ptr);
      }
    });
  });

  describe('Edge Cases', () => {
    it('writeVkeyWitnessSet should throw for invalid witness data', () => {
      const invalidSet = [{ signature: 'invalid-hex', vkey: 'invalid-hex' }];
      expect(() => Cometa.writeVkeyWitnessSet(invalidSet)).toThrow();
    });
  });

  describe('Memory Management', () => {
    it('should not leak memory when processing a witness set', () => {
      const ptr = Cometa.writeVkeyWitnessSet(VALID_VKEY_WITNESS_SET);
      const readSet = Cometa.readVkeyWitnessSet(ptr);

      expect(new Set(readSet)).toEqual(new Set(VALID_VKEY_WITNESS_SET));
      Cometa.unrefObject(ptr);
    });
  });
});
