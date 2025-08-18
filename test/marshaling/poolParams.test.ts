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

import * as Cometa from '../../src';
import { MemoryLeakDetector } from '../util/memory';

/* TESTS *********************************************************************/

describe('PoolParameters', () => {
  let detector: MemoryLeakDetector;

  const VALID_POOL_PARAMS: Cometa.PoolParameters = {
    cost: 340000000n,
    id: '00112233445566778899aabbccddeeff00112233445566778899aabb',
    margin: 0.05,
    metadataJson: {
      dataHash: '20112233445566778899aabbccddeeff00112233445566778899aabbccddeeff',
      url: 'https://example.com/pool.json'
    },
    owners: ['20112233445566778899aabbccddeeff00112233445566778899aabb'],
    pledge: 100000000000n,
    relays: [
      { ipv4: '127.0.0.1', port: 3001 },
      { ipv6: '0102:0304:0102:0304:0102:0304:0102:0304', port: 3002 },
      { hostname: 'relay.example.com', port: 3002 },
      { dnsName: 'relays.example.com' }
    ],
    rewardAccount: 'stake_test17rphkx6acpnf78fuvxn0mkew3l0fd058hzquvz7w36x4gtcljw6kf',
    vrf: '101112131415161718191a1b1c1d1e1f101112131415161718191a1b1c1d1e1f'
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

  describe('writePoolParameters & readPoolParameters', () => {
    it('should correctly write and read a full PoolParameters object', () => {
      // Act
      const ptr = Cometa.writePoolParameters(VALID_POOL_PARAMS);
      expect(ptr).not.toBe(0);
      const readValue = Cometa.readPoolParameters(ptr);

      // Assert
      expect(readValue).toEqual(VALID_POOL_PARAMS);

      // Cleanup
      Cometa.unrefObject(ptr);
    });

    it('should correctly handle a PoolParameters object without metadata', () => {
      // Arrange
      const { metadataJson, ...paramsWithoutMetadata } = VALID_POOL_PARAMS;

      // Act
      const ptr = Cometa.writePoolParameters(paramsWithoutMetadata);
      expect(ptr).not.toBe(0);
      const readValue = Cometa.readPoolParameters(ptr);

      // Assert
      expect(readValue.metadataJson).toBeUndefined();
      expect(readValue).toEqual(paramsWithoutMetadata);

      // Cleanup
      Cometa.unrefObject(ptr);
    });
  });

  describe('Edge Cases', () => {
    it('readPoolParameters should throw an error for a null pointer', () => {
      expect(() => Cometa.readPoolParameters(0)).toThrow();
    });

    it('writePoolParameters should throw for an invalid pool ID (operator hash)', () => {
      const invalidParams = { ...VALID_POOL_PARAMS, id: 'invalid-hex' };
      expect(() => Cometa.writePoolParameters(invalidParams)).toThrow();
    });

    it('writePoolParameters should throw for an invalid reward address', () => {
      const invalidParams = { ...VALID_POOL_PARAMS, rewardAccount: 'invalid-bech32-address' };
      expect(() => Cometa.writePoolParameters(invalidParams)).toThrow();
    });

    it('should handle an empty list of owners', () => {
      // Arrange
      const params = { ...VALID_POOL_PARAMS, owners: [] };

      // Act
      const ptr = Cometa.writePoolParameters(params);
      const readValue = Cometa.readPoolParameters(ptr);

      // Assert
      expect(readValue.owners).toEqual([]);

      // Cleanup
      Cometa.unrefObject(ptr);
    });

    it('should handle an empty list of relays', () => {
      // Arrange
      const params = { ...VALID_POOL_PARAMS, relays: [] };

      // Act
      const ptr = Cometa.writePoolParameters(params);
      const readValue = Cometa.readPoolParameters(ptr);

      // Assert
      expect(readValue.relays).toEqual([]);

      // Cleanup
      Cometa.unrefObject(ptr);
    });
  });

  describe('Memory Management', () => {
    it('should not leak memory when creating and freeing a PoolParameters object', () => {
      // This test's primary assertion is handled by the MemoryLeakDetector in afterEach
      const ptr = Cometa.writePoolParameters(VALID_POOL_PARAMS);
      expect(() => Cometa.unrefObject(ptr)).not.toThrow();
    });
  });
});
