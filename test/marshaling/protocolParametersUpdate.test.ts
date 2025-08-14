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

describe('Protocol Parameter Update', () => {
  let detector: MemoryLeakDetector;

  const FULL_UPDATE: Cometa.ProtocolParametersUpdate = {
    adaPerUtxoByte: 11,
    collateralPercent: 13,
    committeeTermLimit: 16,
    costModels: [
      { costs: [1, 2, 3], language: 'PlutusV1' },
      { costs: [4, 5, 6], language: 'PlutusV2' }
    ],
    decentralisationParam: { denominator: 2, numerator: 1 },
    drepDeposit: 19,
    drepInactivityPeriod: 20,
    drepVotingThresholds: {
      committeeNoConfidence: { denominator: 2, numerator: 1 },
      committeeNormal: { denominator: 2, numerator: 1 },
      hardForkInitiation: { denominator: 2, numerator: 1 },
      motionNoConfidence: { denominator: 2, numerator: 1 },
      ppEconomicGroup: { denominator: 2, numerator: 1 },
      ppGovernanceGroup: { denominator: 2, numerator: 1 },
      ppNetworkGroup: { denominator: 2, numerator: 1 },
      ppTechnicalGroup: { denominator: 2, numerator: 1 },
      treasuryWithdrawal: { denominator: 2, numerator: 1 },
      updateConstitution: { denominator: 2, numerator: 1 }
    },
    executionCosts: {
      memory: { denominator: 1, numerator: 1 },
      steps: { denominator: 2, numerator: 1 }
    },
    expansionRate: { denominator: 2, numerator: 1 },
    extraEntropy: '00112233',
    governanceActionDeposit: 18,
    governanceActionValidityPeriod: 17,
    keyDeposit: 6,
    maxBlockBodySize: 3,
    maxBlockExUnits: { memory: 1, steps: 2 },
    maxBlockHeaderSize: 5,
    maxCollateralInputs: 14,
    maxEpoch: 8,
    maxTxExUnits: { memory: 3, steps: 4 },
    maxTxSize: 4,
    maxValueSize: 12,
    minCommitteeSize: 15,
    minFeeA: 1,
    minFeeB: 2,
    minPoolCost: 10,
    nOpt: 9,
    poolDeposit: 7,
    poolPledgeInfluence: { denominator: 2, numerator: 1 },
    poolVotingThresholds: {
      committeeNoConfidence: { denominator: 2, numerator: 1 },
      committeeNormal: { denominator: 2, numerator: 1 },
      hardForkInitiation: { denominator: 2, numerator: 1 },
      motionNoConfidence: { denominator: 2, numerator: 1 },
      securityRelevantParamVotingThreshold: { denominator: 2, numerator: 1 }
    },
    protocolVersion: { major: 9, minor: 1 },
    refScriptCostPerByte: { denominator: 100, numerator: 5 },
    treasuryGrowthRate: { denominator: 10, numerator: 1 }
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

  it('should write and read a full update with all parameters', () => {
    const ptr = Cometa.writeProtocolParamUpdate(FULL_UPDATE);
    try {
      const readUpdate = Cometa.readProtocolParamUpdate(ptr);
      // Extra entropy is a special case due to null vs undefined
      const expected = { ...FULL_UPDATE };
      if (expected.extraEntropy === null) {
        delete expected.extraEntropy;
      }
      expect(readUpdate).toEqual(expected);
    } finally {
      Cometa.unrefObject(ptr);
    }
  });

  it('should write and read a partial update with only a few parameters', () => {
    const partialUpdate: Cometa.ProtocolParametersUpdate = {
      maxTxSize: 18432,
      minFeeB: 50,
      protocolVersion: { major: 10, minor: 0 }
    };

    const ptr = Cometa.writeProtocolParamUpdate(partialUpdate);
    try {
      const readUpdate = Cometa.readProtocolParamUpdate(ptr);
      expect(readUpdate).toEqual(partialUpdate);
    } finally {
      Cometa.unrefObject(ptr);
    }
  });

  it('should write and read an empty update object', () => {
    const emptyUpdate: Cometa.ProtocolParametersUpdate = {};

    const ptr = Cometa.writeProtocolParamUpdate(emptyUpdate);
    try {
      const readUpdate = Cometa.readProtocolParamUpdate(ptr);
      expect(readUpdate).toEqual({});
    } finally {
      Cometa.unrefObject(ptr);
    }
  });

  it('should handle zero values correctly', () => {
    const updateWithZeros: Cometa.ProtocolParametersUpdate = {
      keyDeposit: 0,
      maxBlockBodySize: 0,
      minFeeA: 0
    };
    const ptr = Cometa.writeProtocolParamUpdate(updateWithZeros);
    try {
      const readUpdate = Cometa.readProtocolParamUpdate(ptr);
      expect(readUpdate).toEqual({
        keyDeposit: 0,
        maxBlockBodySize: 0,
        minFeeA: 0
      });
    } finally {
      Cometa.unrefObject(ptr);
    }
  });

  describe('Memory Management', () => {
    it('should not leak memory when processing various updates', () => {
      const updatesToTest = [
        FULL_UPDATE,
        { minFeeA: 123 },
        { costModels: [{ costs: [100, 200], language: 'PlutusV1' }] },
        {}
      ];

      for (const update of updatesToTest) {
        const ptr = Cometa.writeProtocolParamUpdate(update);
        Cometa.unrefObject(ptr);
      }
    });
  });
});
