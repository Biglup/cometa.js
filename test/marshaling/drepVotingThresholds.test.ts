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

describe('DRepVotingThresholds', () => {
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

  const testThresholds: Cometa.DelegateRepresentativeThresholds = {
    committeeNoConfidence: { denominator: 4, numerator: 1 },
    committeeNormal: { denominator: 3, numerator: 1 },
    hardForkInitiation: { denominator: 5, numerator: 1 },
    motionNoConfidence: { denominator: 2, numerator: 1 },
    ppEconomicGroup: { denominator: 8, numerator: 1 },
    ppGovernanceGroup: { denominator: 10, numerator: 1 },
    ppNetworkGroup: { denominator: 7, numerator: 1 },
    ppTechnicalGroup: { denominator: 9, numerator: 1 },
    treasuryWithdrawal: { denominator: 11, numerator: 1 },
    updateConstitution: { denominator: 6, numerator: 1 }
  };

  it('should write and read DRep voting thresholds', () => {
    const ptr = Cometa.writeDRepVotingThresholds(testThresholds);
    try {
      const readThresholds = Cometa.readDRepVotingThresholds(ptr);
      expect(readThresholds).toEqual(testThresholds);
    } finally {
      Cometa.derefDRepVotingThresholds(ptr);
    }
  });

  it('should handle zero values', () => {
    const zeroThresholds: Cometa.DelegateRepresentativeThresholds = {
      committeeNoConfidence: { denominator: 1, numerator: 0 },
      committeeNormal: { denominator: 1, numerator: 0 },
      hardForkInitiation: { denominator: 1, numerator: 0 },
      motionNoConfidence: { denominator: 1, numerator: 0 },
      ppEconomicGroup: { denominator: 1, numerator: 0 },
      ppGovernanceGroup: { denominator: 1, numerator: 0 },
      ppNetworkGroup: { denominator: 1, numerator: 0 },
      ppTechnicalGroup: { denominator: 1, numerator: 0 },
      treasuryWithdrawal: { denominator: 1, numerator: 0 },
      updateConstitution: { denominator: 1, numerator: 0 }
    };

    const ptr = Cometa.writeDRepVotingThresholds(zeroThresholds);
    try {
      const readThresholds = Cometa.readDRepVotingThresholds(ptr);
      expect(readThresholds).toEqual(zeroThresholds);
    } finally {
      Cometa.derefDRepVotingThresholds(ptr);
    }
  });

  it('should handle maximum values', () => {
    const maxThresholds: Cometa.DelegateRepresentativeThresholds = {
      committeeNoConfidence: { denominator: 1, numerator: 1 },
      committeeNormal: { denominator: 1, numerator: 1 },
      hardForkInitiation: { denominator: 1, numerator: 1 },
      motionNoConfidence: { denominator: 1, numerator: 1 },
      ppEconomicGroup: { denominator: 1, numerator: 1 },
      ppGovernanceGroup: { denominator: 1, numerator: 1 },
      ppNetworkGroup: { denominator: 1, numerator: 1 },
      ppTechnicalGroup: { denominator: 1, numerator: 1 },
      treasuryWithdrawal: { denominator: 1, numerator: 1 },
      updateConstitution: { denominator: 1, numerator: 1 }
    };

    const ptr = Cometa.writeDRepVotingThresholds(maxThresholds);
    try {
      const readThresholds = Cometa.readDRepVotingThresholds(ptr);
      expect(readThresholds).toEqual(maxThresholds);
    } finally {
      Cometa.derefDRepVotingThresholds(ptr);
    }
  });

  it('should handle decimal values', () => {
    const decimalThresholds: Cometa.DelegateRepresentativeThresholds = {
      committeeNoConfidence: { denominator: 10, numerator: 3 },
      committeeNormal: { denominator: 10, numerator: 2 },
      hardForkInitiation: { denominator: 10, numerator: 4 },
      motionNoConfidence: { denominator: 10, numerator: 1 },
      ppEconomicGroup: { denominator: 10, numerator: 7 },
      ppGovernanceGroup: { denominator: 10, numerator: 9 },
      ppNetworkGroup: { denominator: 10, numerator: 6 },
      ppTechnicalGroup: { denominator: 10, numerator: 8 },
      treasuryWithdrawal: { denominator: 10, numerator: 10 },
      updateConstitution: { denominator: 10, numerator: 5 }
    };

    const ptr = Cometa.writeDRepVotingThresholds(decimalThresholds);
    try {
      const readThresholds = Cometa.readDRepVotingThresholds(ptr);
      expect(readThresholds).toEqual(decimalThresholds);
    } finally {
      Cometa.derefDRepVotingThresholds(ptr);
    }
  });

  it('should handle large denominator values', () => {
    const largeDenominatorThresholds: Cometa.DelegateRepresentativeThresholds = {
      committeeNoConfidence: { denominator: 1000, numerator: 3 },
      committeeNormal: { denominator: 1000, numerator: 2 },
      hardForkInitiation: { denominator: 1000, numerator: 4 },
      motionNoConfidence: { denominator: 1000, numerator: 1 },
      ppEconomicGroup: { denominator: 1000, numerator: 7 },
      ppGovernanceGroup: { denominator: 1000, numerator: 9 },
      ppNetworkGroup: { denominator: 1000, numerator: 6 },
      ppTechnicalGroup: { denominator: 1000, numerator: 8 },
      treasuryWithdrawal: { denominator: 1000, numerator: 10 },
      updateConstitution: { denominator: 1000, numerator: 5 }
    };

    const ptr = Cometa.writeDRepVotingThresholds(largeDenominatorThresholds);
    try {
      const readThresholds = Cometa.readDRepVotingThresholds(ptr);
      expect(readThresholds).toEqual(largeDenominatorThresholds);
    } finally {
      Cometa.derefDRepVotingThresholds(ptr);
    }
  });

  it('should throw error when reading from null pointer', () => {
    expect(() => Cometa.readDRepVotingThresholds(0)).toThrow('Pointer is null');
  });

  it('should throw error when dereferencing null pointer', () => {
    expect(() => Cometa.derefDRepVotingThresholds(0)).toThrow('Pointer is null');
  });

  it('should handle multiple write and read operations', () => {
    const ptr1 = Cometa.writeDRepVotingThresholds(testThresholds);
    const ptr2 = Cometa.writeDRepVotingThresholds(testThresholds);
    try {
      const readThresholds1 = Cometa.readDRepVotingThresholds(ptr1);
      const readThresholds2 = Cometa.readDRepVotingThresholds(ptr2);
      expect(readThresholds1).toEqual(testThresholds);
      expect(readThresholds2).toEqual(testThresholds);
    } finally {
      Cometa.derefDRepVotingThresholds(ptr1);
      Cometa.derefDRepVotingThresholds(ptr2);
    }
  });

  it('should handle dereferencing multiple times', () => {
    const ptr = Cometa.writeDRepVotingThresholds(testThresholds);
    try {
      Cometa.derefDRepVotingThresholds(ptr);
      // Second dereference should not throw
      Cometa.derefDRepVotingThresholds(ptr);
    } catch {
      fail('Dereferencing multiple times should not throw');
    }
  });
});
