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

describe('PoolVotingThresholds', () => {
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

  describe('writePoolVotingThresholds', () => {
    it('should write pool voting thresholds to WASM memory', () => {
      const thresholds: Cometa.PoolVotingThresholds = {
        committeeNoConfidence: Cometa.toUnitInterval(0.7),
        committeeNormal: Cometa.toUnitInterval(0.6),
        hardForkInitiation: Cometa.toUnitInterval(0.8),
        motionNoConfidence: Cometa.toUnitInterval(0.5),
        securityRelevantParamVotingThreshold: Cometa.toUnitInterval(0.9)
      };

      const ptr = Cometa.writePoolVotingThresholds(thresholds);
      expect(ptr).toBeGreaterThan(0);

      // Clean up
      Cometa.derefPoolVotingThresholds(ptr);
    });

    it('should throw an error for null pointer', () => {
      expect(() => Cometa.readPoolVotingThresholds(0)).toThrow('Pointer is null');
    });
  });

  describe('readPoolVotingThresholds', () => {
    it('should read pool voting thresholds from WASM memory', () => {
      const thresholds: Cometa.PoolVotingThresholds = {
        committeeNoConfidence: Cometa.toUnitInterval(0.7),
        committeeNormal: Cometa.toUnitInterval(0.6),
        hardForkInitiation: Cometa.toUnitInterval(0.8),
        motionNoConfidence: Cometa.toUnitInterval(0.5),
        securityRelevantParamVotingThreshold: Cometa.toUnitInterval(0.9)
      };

      const ptr = Cometa.writePoolVotingThresholds(thresholds);
      try {
        const readThresholds = Cometa.readPoolVotingThresholds(ptr);
        expect(readThresholds).toEqual(thresholds);
      } finally {
        Cometa.derefPoolVotingThresholds(ptr);
      }
    });

    it('should handle edge case values', () => {
      const thresholds: Cometa.PoolVotingThresholds = {
        committeeNoConfidence: Cometa.toUnitInterval(0.999999),
        committeeNormal: Cometa.toUnitInterval(0.000001),
        hardForkInitiation: Cometa.toUnitInterval(1),
        motionNoConfidence: Cometa.toUnitInterval(0),
        securityRelevantParamVotingThreshold: Cometa.toUnitInterval(0.5)
      };

      const ptr = Cometa.writePoolVotingThresholds(thresholds);
      try {
        const readThresholds = Cometa.readPoolVotingThresholds(ptr);
        expect(readThresholds).toEqual(thresholds);
      } finally {
        Cometa.derefPoolVotingThresholds(ptr);
      }
    });
  });

  describe('derefPoolVotingThresholds', () => {
    it('should free the pool voting thresholds memory', () => {
      const thresholds: Cometa.PoolVotingThresholds = {
        committeeNoConfidence: Cometa.toUnitInterval(0.7),
        committeeNormal: Cometa.toUnitInterval(0.6),
        hardForkInitiation: Cometa.toUnitInterval(0.8),
        motionNoConfidence: Cometa.toUnitInterval(0.5),
        securityRelevantParamVotingThreshold: Cometa.toUnitInterval(0.9)
      };

      const ptr = Cometa.writePoolVotingThresholds(thresholds);
      Cometa.derefPoolVotingThresholds(ptr);

      // The pointer should be invalid after deref
      expect(() => Cometa.readPoolVotingThresholds(ptr)).toThrow();
    });

    it('should throw an error for null pointer', () => {
      expect(() => Cometa.derefPoolVotingThresholds(0)).toThrow('Pointer is null');
    });
  });
});
