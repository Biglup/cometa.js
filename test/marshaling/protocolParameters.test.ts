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

/* TESTS *********************************************************************/

describe('Protocol Parameters', () => {
  beforeAll(async () => {
    await Cometa.ready();
  });

  it('should write and read protocol parameters', () => {
    const params: Cometa.ProtocolParameters = {
      adaPerUtxoByte: 11,
      collateralPercent: 13,
      committeeTermLimit: 16,
      costModels: [
        { costs: [1, 2, 3], language: 'PlutusV1' },
        { costs: [4, 5, 6], language: 'PlutusV2' },
        { costs: [7, 8, 9], language: 'PlutusV3' }
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
        steps: { denominator: 1, numerator: 2 }
      },
      expansionRate: { denominator: 2, numerator: 1 },
      extraEntropy: null,
      governanceActionDeposit: 18,
      governanceActionValidityPeriod: 17,
      keyDeposit: 6,
      maxBlockBodySize: 3,
      maxBlockExUnits: {
        memory: 1,
        steps: 2
      },
      maxBlockHeaderSize: 5,
      maxCollateralInputs: 14,
      maxEpoch: 8,
      maxTxExUnits: {
        memory: 1,
        steps: 2
      },
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
      protocolVersion: { major: 1, minor: 2 },
      refScriptCostPerByte: { denominator: 2, numerator: 1 },
      treasuryGrowthRate: { denominator: 2, numerator: 1 }
    };

    const ptr = Cometa.writeProtocolParameters(params);
    try {
      const readParams = Cometa.readProtocolParameters(ptr);
      expect(readParams).toEqual(params);
    } finally {
      Cometa.derefProtocolParameters(ptr);
    }
  });

  it('should handle zero values', () => {
    const params: Cometa.ProtocolParameters = {
      adaPerUtxoByte: 0,
      collateralPercent: 0,
      committeeTermLimit: 0,
      costModels: [
        { costs: [0, 0, 0], language: 'PlutusV1' },
        { costs: [0, 0, 0], language: 'PlutusV2' },
        { costs: [0, 0, 0], language: 'PlutusV3' }
      ],
      decentralisationParam: { denominator: 1, numerator: 0 },
      drepDeposit: 0,
      drepInactivityPeriod: 0,
      drepVotingThresholds: {
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
      },
      executionCosts: {
        memory: { denominator: 0, numerator: 0 },
        steps: { denominator: 0, numerator: 0 }
      },
      expansionRate: { denominator: 1, numerator: 0 },
      extraEntropy: null,
      governanceActionDeposit: 0,
      governanceActionValidityPeriod: 0,
      keyDeposit: 0,
      maxBlockBodySize: 0,
      maxBlockExUnits: {
        memory: 0,
        steps: 0
      },
      maxBlockHeaderSize: 0,
      maxCollateralInputs: 0,
      maxEpoch: 0,
      maxTxExUnits: {
        memory: 0,
        steps: 0
      },
      maxTxSize: 0,
      maxValueSize: 0,
      minCommitteeSize: 0,
      minFeeA: 0,
      minFeeB: 0,
      minPoolCost: 0,
      nOpt: 0,
      poolDeposit: 0,
      poolPledgeInfluence: { denominator: 1, numerator: 0 },
      poolVotingThresholds: {
        committeeNoConfidence: { denominator: 1, numerator: 0 },
        committeeNormal: { denominator: 1, numerator: 0 },
        hardForkInitiation: { denominator: 1, numerator: 0 },
        motionNoConfidence: { denominator: 1, numerator: 0 },
        securityRelevantParamVotingThreshold: { denominator: 1, numerator: 0 }
      },
      protocolVersion: { major: 0, minor: 1 },
      refScriptCostPerByte: { denominator: 1, numerator: 0 },
      treasuryGrowthRate: { denominator: 1, numerator: 0 }
    };

    const ptr = Cometa.writeProtocolParameters(params);
    try {
      const readParams = Cometa.readProtocolParameters(ptr);
      expect(readParams).toEqual(params);
    } finally {
      Cometa.derefProtocolParameters(ptr);
    }
  });

  it('should handle big values', () => {
    const params: Cometa.ProtocolParameters = {
      adaPerUtxoByte: 294967295,
      collateralPercent: 294967295,
      committeeTermLimit: 294967295,
      costModels: [
        { costs: [294967295, 294967295, 294967295], language: 'PlutusV1' },
        { costs: [294967295, 294967295, 294967295], language: 'PlutusV2' },
        { costs: [294967295, 294967295, 294967295], language: 'PlutusV3' }
      ],
      decentralisationParam: { denominator: 294967295, numerator: 294967295 },
      drepDeposit: 294967295,
      drepInactivityPeriod: 294967295,
      drepVotingThresholds: {
        committeeNoConfidence: { denominator: 294967295, numerator: 294967295 },
        committeeNormal: { denominator: 294967295, numerator: 294967295 },
        hardForkInitiation: { denominator: 294967295, numerator: 294967295 },
        motionNoConfidence: { denominator: 294967295, numerator: 294967295 },
        ppEconomicGroup: { denominator: 294967295, numerator: 294967295 },
        ppGovernanceGroup: { denominator: 294967295, numerator: 294967295 },
        ppNetworkGroup: { denominator: 294967295, numerator: 294967295 },
        ppTechnicalGroup: { denominator: 294967295, numerator: 294967295 },
        treasuryWithdrawal: { denominator: 294967295, numerator: 294967295 },
        updateConstitution: { denominator: 294967295, numerator: 294967295 }
      },
      executionCosts: {
        memory: { denominator: 294967295, numerator: 294967295 },
        steps: { denominator: 294967295, numerator: 294967295 }
      },
      expansionRate: { denominator: 294967295, numerator: 294967295 },
      extraEntropy: null,
      governanceActionDeposit: 294967295,
      governanceActionValidityPeriod: 294967295,
      keyDeposit: 294967295,
      maxBlockBodySize: 294967295,
      maxBlockExUnits: {
        memory: 294967295,
        steps: 294967295
      },
      maxBlockHeaderSize: 294967295,
      maxCollateralInputs: 294967295,
      maxEpoch: 294967295,
      maxTxExUnits: {
        memory: 294967295,
        steps: 294967295
      },
      maxTxSize: 294967295,
      maxValueSize: 294967295,
      minCommitteeSize: 294967295,
      minFeeA: 294967295,
      minFeeB: 294967295,
      minPoolCost: 294967295,
      nOpt: 294967295,
      poolDeposit: 294967295,
      poolPledgeInfluence: { denominator: 294967295, numerator: 294967295 },
      poolVotingThresholds: {
        committeeNoConfidence: { denominator: 294967295, numerator: 294967295 },
        committeeNormal: { denominator: 294967295, numerator: 294967295 },
        hardForkInitiation: { denominator: 294967295, numerator: 294967295 },
        motionNoConfidence: { denominator: 294967295, numerator: 294967295 },
        securityRelevantParamVotingThreshold: { denominator: 294967295, numerator: 294967295 }
      },
      protocolVersion: { major: 294967295, minor: 294967295 },
      refScriptCostPerByte: { denominator: 294967295, numerator: 294967295 },
      treasuryGrowthRate: { denominator: 294967295, numerator: 294967295 }
    };

    const ptr = Cometa.writeProtocolParameters(params);
    try {
      const readParams = Cometa.readProtocolParameters(ptr);
      expect(readParams).toEqual(params);
    } finally {
      Cometa.derefProtocolParameters(ptr);
    }
  });

  it('should handle decimal values', () => {
    const params: Cometa.ProtocolParameters = {
      adaPerUtxoByte: 8,
      collateralPercent: 2,
      committeeTermLimit: 16,
      costModels: [
        { costs: [1, 2, 3], language: 'PlutusV1' },
        { costs: [4, 5, 6], language: 'PlutusV2' },
        { costs: [7, 8, 9], language: 'PlutusV3' }
      ],
      decentralisationParam: { denominator: 10, numerator: 4 },
      drepDeposit: 19,
      drepInactivityPeriod: 20,
      drepVotingThresholds: {
        committeeNoConfidence: { denominator: 10, numerator: 3 },
        committeeNormal: { denominator: 10, numerator: 2 },
        hardForkInitiation: { denominator: 10, numerator: 4 },
        motionNoConfidence: { denominator: 10, numerator: 1 },
        ppEconomicGroup: { denominator: 10, numerator: 7 },
        ppGovernanceGroup: { denominator: 10, numerator: 9 },
        ppNetworkGroup: { denominator: 10, numerator: 6 },
        ppTechnicalGroup: { denominator: 10, numerator: 8 },
        treasuryWithdrawal: { denominator: 10, numerator: 1 },
        updateConstitution: { denominator: 10, numerator: 5 }
      },
      executionCosts: {
        memory: { denominator: 1, numerator: 1 },
        steps: { denominator: 2, numerator: 1 }
      },
      expansionRate: { denominator: 10, numerator: 3 },
      extraEntropy: null,
      governanceActionDeposit: 18,
      governanceActionValidityPeriod: 17,
      keyDeposit: 6,
      maxBlockBodySize: 3,
      maxBlockExUnits: {
        memory: 1,
        steps: 2
      },
      maxBlockHeaderSize: 5,
      maxCollateralInputs: 3,
      maxEpoch: 8,
      maxTxExUnits: {
        memory: 1,
        steps: 2
      },
      maxTxSize: 4,
      maxValueSize: 1,
      minCommitteeSize: 15,
      minFeeA: 1,
      minFeeB: 2,
      minPoolCost: 7,
      nOpt: 9,
      poolDeposit: 7,
      poolPledgeInfluence: { denominator: 10, numerator: 1 },
      poolVotingThresholds: {
        committeeNoConfidence: { denominator: 10, numerator: 3 },
        committeeNormal: { denominator: 10, numerator: 2 },
        hardForkInitiation: { denominator: 10, numerator: 4 },
        motionNoConfidence: { denominator: 10, numerator: 1 },
        securityRelevantParamVotingThreshold: { denominator: 10, numerator: 5 }
      },
      protocolVersion: { major: 1, minor: 10 },
      refScriptCostPerByte: { denominator: 10, numerator: 1 },
      treasuryGrowthRate: { denominator: 10, numerator: 2 }
    };

    const ptr = Cometa.writeProtocolParameters(params);
    try {
      const readParams = Cometa.readProtocolParameters(ptr);
      expect(readParams).toEqual(params);
    } finally {
      Cometa.derefProtocolParameters(ptr);
    }
  });

  it('should handle large denominator values', () => {
    const params: Cometa.ProtocolParameters = {
      adaPerUtxoByte: 8,
      collateralPercent: 2,
      committeeTermLimit: 16,
      costModels: [
        { costs: [1, 2, 3], language: 'PlutusV1' },
        { costs: [4, 5, 6], language: 'PlutusV2' },
        { costs: [7, 8, 9], language: 'PlutusV3' }
      ],
      decentralisationParam: { denominator: 1000, numerator: 4 },
      drepDeposit: 19,
      drepInactivityPeriod: 20,
      drepVotingThresholds: {
        committeeNoConfidence: { denominator: 1000, numerator: 3 },
        committeeNormal: { denominator: 1000, numerator: 2 },
        hardForkInitiation: { denominator: 1000, numerator: 4 },
        motionNoConfidence: { denominator: 1000, numerator: 1 },
        ppEconomicGroup: { denominator: 1000, numerator: 7 },
        ppGovernanceGroup: { denominator: 1000, numerator: 9 },
        ppNetworkGroup: { denominator: 1000, numerator: 6 },
        ppTechnicalGroup: { denominator: 1000, numerator: 8 },
        treasuryWithdrawal: { denominator: 1000, numerator: 1 },
        updateConstitution: { denominator: 1000, numerator: 5 }
      },
      executionCosts: {
        memory: { denominator: 1, numerator: 1 },
        steps: { denominator: 2, numerator: 1 }
      },
      expansionRate: { denominator: 1000, numerator: 3 },
      extraEntropy: null,
      governanceActionDeposit: 18,
      governanceActionValidityPeriod: 17,
      keyDeposit: 6,
      maxBlockBodySize: 3,
      maxBlockExUnits: {
        memory: 1,
        steps: 2
      },
      maxBlockHeaderSize: 5,
      maxCollateralInputs: 3,
      maxEpoch: 8,
      maxTxExUnits: {
        memory: 1,
        steps: 2
      },
      maxTxSize: 4,
      maxValueSize: 1,
      minCommitteeSize: 15,
      minFeeA: 1,
      minFeeB: 2,
      minPoolCost: 7,
      nOpt: 9,
      poolDeposit: 7,
      poolPledgeInfluence: { denominator: 1000, numerator: 1 },
      poolVotingThresholds: {
        committeeNoConfidence: { denominator: 1000, numerator: 3 },
        committeeNormal: { denominator: 1000, numerator: 2 },
        hardForkInitiation: { denominator: 1000, numerator: 4 },
        motionNoConfidence: { denominator: 1000, numerator: 1 },
        securityRelevantParamVotingThreshold: { denominator: 1000, numerator: 5 }
      },
      protocolVersion: { major: 1, minor: 1000 },
      refScriptCostPerByte: { denominator: 1000, numerator: 1 },
      treasuryGrowthRate: { denominator: 1000, numerator: 2 }
    };

    const ptr = Cometa.writeProtocolParameters(params);
    try {
      const readParams = Cometa.readProtocolParameters(ptr);
      expect(readParams).toEqual(params);
    } finally {
      Cometa.derefProtocolParameters(ptr);
    }
  });

  it('should handle mixed values', () => {
    const params: Cometa.ProtocolParameters = {
      adaPerUtxoByte: 1,
      collateralPercent: 1,
      committeeTermLimit: 16,
      costModels: [
        { costs: [0, 0, 0], language: 'PlutusV1' },
        { costs: [1, 2, 3], language: 'PlutusV2' },
        { costs: [294967295, 294967295, 294967295], language: 'PlutusV3' }
      ],
      decentralisationParam: { denominator: 10, numerator: 1 },
      drepDeposit: 19,
      drepInactivityPeriod: 20,
      drepVotingThresholds: {
        committeeNoConfidence: { denominator: 10, numerator: 1 },
        committeeNormal: { denominator: 2, numerator: 1 },
        hardForkInitiation: { denominator: 1000, numerator: 1 },
        motionNoConfidence: { denominator: 1, numerator: 0 },
        ppEconomicGroup: { denominator: 2, numerator: 1 },
        ppGovernanceGroup: { denominator: 1000, numerator: 1 },
        ppNetworkGroup: { denominator: 1, numerator: 0 },
        ppTechnicalGroup: { denominator: 10, numerator: 1 },
        treasuryWithdrawal: { denominator: 294967295, numerator: 294967295 },
        updateConstitution: { denominator: 294967295, numerator: 294967295 }
      },
      executionCosts: {
        memory: { denominator: 1, numerator: 1 },
        steps: { denominator: 2, numerator: 1 }
      },
      expansionRate: { denominator: 2, numerator: 1 },
      extraEntropy: null,
      governanceActionDeposit: 18,
      governanceActionValidityPeriod: 17,
      keyDeposit: 0,
      maxBlockBodySize: 1,
      maxBlockExUnits: {
        memory: 294967295,
        steps: 0
      },
      maxBlockHeaderSize: 294967295,
      maxCollateralInputs: 1,
      maxEpoch: 1,
      maxTxExUnits: {
        memory: 0,
        steps: 294967295
      },
      maxTxSize: 1,
      maxValueSize: 0,
      minCommitteeSize: 15,
      minFeeA: 0,
      minFeeB: 1,
      minPoolCost: 0,
      nOpt: 1,
      poolDeposit: 1,
      poolPledgeInfluence: { denominator: 294967295, numerator: 294967295 },
      poolVotingThresholds: {
        committeeNoConfidence: { denominator: 10, numerator: 1 },
        committeeNormal: { denominator: 2, numerator: 1 },
        hardForkInitiation: { denominator: 1000, numerator: 1 },
        motionNoConfidence: { denominator: 1, numerator: 0 },
        securityRelevantParamVotingThreshold: { denominator: 294967295, numerator: 294967295 }
      },
      protocolVersion: { major: 294967295, minor: 294967295 },
      refScriptCostPerByte: { denominator: 1, numerator: 0 },
      treasuryGrowthRate: { denominator: 1, numerator: 0 }
    };

    const ptr = Cometa.writeProtocolParameters(params);
    try {
      const readParams = Cometa.readProtocolParameters(ptr);
      expect(readParams).toEqual(params);
    } finally {
      Cometa.derefProtocolParameters(ptr);
    }
  });

  it('should handle error cases', () => {
    expect(() => Cometa.readProtocolParameters(0)).toThrow('Pointer is null');
    expect(() => Cometa.derefProtocolParameters(0)).toThrow('Pointer is null');
  });

  it('should handle multiple operations', () => {
    const params1: Cometa.ProtocolParameters = {
      adaPerUtxoByte: 1,
      collateralPercent: 1,
      committeeTermLimit: 16,
      costModels: [
        { costs: [1, 2, 3], language: 'PlutusV1' },
        { costs: [4, 5, 6], language: 'PlutusV2' },
        { costs: [7, 8, 9], language: 'PlutusV3' }
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
      extraEntropy: null,
      governanceActionDeposit: 18,
      governanceActionValidityPeriod: 17,
      keyDeposit: 1,
      maxBlockBodySize: 1,
      maxBlockExUnits: {
        memory: 1,
        steps: 2
      },
      maxBlockHeaderSize: 1,
      maxCollateralInputs: 1,
      maxEpoch: 1,
      maxTxExUnits: {
        memory: 1,
        steps: 2
      },
      maxTxSize: 1,
      maxValueSize: 1,
      minCommitteeSize: 15,
      minFeeA: 1,
      minFeeB: 1,
      minPoolCost: 1,
      nOpt: 1,
      poolDeposit: 1,
      poolPledgeInfluence: { denominator: 2, numerator: 1 },
      poolVotingThresholds: {
        committeeNoConfidence: { denominator: 2, numerator: 1 },
        committeeNormal: { denominator: 2, numerator: 1 },
        hardForkInitiation: { denominator: 2, numerator: 1 },
        motionNoConfidence: { denominator: 2, numerator: 1 },
        securityRelevantParamVotingThreshold: { denominator: 2, numerator: 1 }
      },
      protocolVersion: { major: 1, minor: 2 },
      refScriptCostPerByte: { denominator: 2, numerator: 1 },
      treasuryGrowthRate: { denominator: 2, numerator: 1 }
    };

    const params2: Cometa.ProtocolParameters = {
      adaPerUtxoByte: 2,
      collateralPercent: 2,
      committeeTermLimit: 16,
      costModels: [
        { costs: [2, 3, 4], language: 'PlutusV1' },
        { costs: [5, 6, 7], language: 'PlutusV2' },
        { costs: [8, 9, 10], language: 'PlutusV3' }
      ],
      decentralisationParam: { denominator: 3, numerator: 2 },
      drepDeposit: 19,
      drepInactivityPeriod: 20,
      drepVotingThresholds: {
        committeeNoConfidence: { denominator: 3, numerator: 2 },
        committeeNormal: { denominator: 3, numerator: 2 },
        hardForkInitiation: { denominator: 3, numerator: 2 },
        motionNoConfidence: { denominator: 3, numerator: 2 },
        ppEconomicGroup: { denominator: 3, numerator: 2 },
        ppGovernanceGroup: { denominator: 3, numerator: 2 },
        ppNetworkGroup: { denominator: 3, numerator: 2 },
        ppTechnicalGroup: { denominator: 3, numerator: 2 },
        treasuryWithdrawal: { denominator: 3, numerator: 2 },
        updateConstitution: { denominator: 3, numerator: 2 }
      },
      executionCosts: {
        memory: { denominator: 1, numerator: 1 },
        steps: { denominator: 2, numerator: 1 }
      },
      expansionRate: { denominator: 3, numerator: 2 },
      extraEntropy: null,
      governanceActionDeposit: 18,
      governanceActionValidityPeriod: 17,
      keyDeposit: 2,
      maxBlockBodySize: 2,
      maxBlockExUnits: {
        memory: 2,
        steps: 3
      },
      maxBlockHeaderSize: 2,
      maxCollateralInputs: 2,
      maxEpoch: 2,
      maxTxExUnits: {
        memory: 2,
        steps: 3
      },
      maxTxSize: 2,
      maxValueSize: 2,
      minCommitteeSize: 15,
      minFeeA: 2,
      minFeeB: 2,
      minPoolCost: 2,
      nOpt: 2,
      poolDeposit: 2,
      poolPledgeInfluence: { denominator: 3, numerator: 2 },
      poolVotingThresholds: {
        committeeNoConfidence: { denominator: 3, numerator: 2 },
        committeeNormal: { denominator: 3, numerator: 2 },
        hardForkInitiation: { denominator: 3, numerator: 2 },
        motionNoConfidence: { denominator: 3, numerator: 2 },
        securityRelevantParamVotingThreshold: { denominator: 3, numerator: 2 }
      },
      protocolVersion: { major: 2, minor: 3 },
      refScriptCostPerByte: { denominator: 3, numerator: 2 },
      treasuryGrowthRate: { denominator: 3, numerator: 2 }
    };

    const ptr1 = Cometa.writeProtocolParameters(params1);
    const ptr2 = Cometa.writeProtocolParameters(params2);

    try {
      const readParams1 = Cometa.readProtocolParameters(ptr1);
      const readParams2 = Cometa.readProtocolParameters(ptr2);

      expect(readParams1).toEqual(params1);
      expect(readParams2).toEqual(params2);
    } finally {
      Cometa.derefProtocolParameters(ptr1);
      Cometa.derefProtocolParameters(ptr2);
    }
  });

  it('should handle sequential operations', () => {
    const params: Cometa.ProtocolParameters = {
      adaPerUtxoByte: 1,
      collateralPercent: 1,
      committeeTermLimit: 16,
      costModels: [
        { costs: [1, 2, 3], language: 'PlutusV1' },
        { costs: [4, 5, 6], language: 'PlutusV2' },
        { costs: [7, 8, 9], language: 'PlutusV3' }
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
      extraEntropy: null,
      governanceActionDeposit: 18,
      governanceActionValidityPeriod: 17,
      keyDeposit: 1,
      maxBlockBodySize: 1,
      maxBlockExUnits: {
        memory: 1,
        steps: 2
      },
      maxBlockHeaderSize: 1,
      maxCollateralInputs: 1,
      maxEpoch: 1,
      maxTxExUnits: {
        memory: 1,
        steps: 2
      },
      maxTxSize: 1,
      maxValueSize: 1,
      minCommitteeSize: 15,
      minFeeA: 1,
      minFeeB: 1,
      minPoolCost: 1,
      nOpt: 1,
      poolDeposit: 1,
      poolPledgeInfluence: { denominator: 2, numerator: 1 },
      poolVotingThresholds: {
        committeeNoConfidence: { denominator: 2, numerator: 1 },
        committeeNormal: { denominator: 2, numerator: 1 },
        hardForkInitiation: { denominator: 2, numerator: 1 },
        motionNoConfidence: { denominator: 2, numerator: 1 },
        securityRelevantParamVotingThreshold: { denominator: 2, numerator: 1 }
      },
      protocolVersion: { major: 1, minor: 2 },
      refScriptCostPerByte: { denominator: 2, numerator: 1 },
      treasuryGrowthRate: { denominator: 2, numerator: 1 }
    };

    const ptr = Cometa.writeProtocolParameters(params);
    try {
      const readParams1 = Cometa.readProtocolParameters(ptr);
      const readParams2 = Cometa.readProtocolParameters(ptr);
      const readParams3 = Cometa.readProtocolParameters(ptr);

      expect(readParams1).toEqual(params);
      expect(readParams2).toEqual(params);
      expect(readParams3).toEqual(params);
    } finally {
      Cometa.derefProtocolParameters(ptr);
    }
  });

  it('should handle different values for each field', () => {
    const params: Cometa.ProtocolParameters = {
      adaPerUtxoByte: 11,
      collateralPercent: 13,
      committeeTermLimit: 16,
      costModels: [
        { costs: [1, 2, 3], language: 'PlutusV1' },
        { costs: [4, 5, 6], language: 'PlutusV2' },
        { costs: [7, 8, 9], language: 'PlutusV3' }
      ],
      decentralisationParam: { denominator: 2, numerator: 1 },
      drepDeposit: 19,
      drepInactivityPeriod: 20,
      drepVotingThresholds: {
        committeeNoConfidence: { denominator: 4, numerator: 3 },
        committeeNormal: { denominator: 3, numerator: 2 },
        hardForkInitiation: { denominator: 5, numerator: 4 },
        motionNoConfidence: { denominator: 2, numerator: 1 },
        ppEconomicGroup: { denominator: 8, numerator: 7 },
        ppGovernanceGroup: { denominator: 10, numerator: 9 },
        ppNetworkGroup: { denominator: 7, numerator: 6 },
        ppTechnicalGroup: { denominator: 9, numerator: 8 },
        treasuryWithdrawal: { denominator: 11, numerator: 10 },
        updateConstitution: { denominator: 6, numerator: 5 }
      },
      executionCosts: {
        memory: { denominator: 1, numerator: 1 },
        steps: { denominator: 2, numerator: 1 }
      },
      expansionRate: { denominator: 2, numerator: 1 },
      extraEntropy: null,
      governanceActionDeposit: 18,
      governanceActionValidityPeriod: 17,
      keyDeposit: 6,
      maxBlockBodySize: 3,
      maxBlockExUnits: {
        memory: 2,
        steps: 3
      },
      maxBlockHeaderSize: 5,
      maxCollateralInputs: 14,
      maxEpoch: 8,
      maxTxExUnits: {
        memory: 1,
        steps: 2
      },
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
        committeeNoConfidence: { denominator: 4, numerator: 3 },
        committeeNormal: { denominator: 3, numerator: 2 },
        hardForkInitiation: { denominator: 5, numerator: 4 },
        motionNoConfidence: { denominator: 2, numerator: 1 },
        securityRelevantParamVotingThreshold: { denominator: 6, numerator: 5 }
      },
      protocolVersion: { major: 1, minor: 2 },
      refScriptCostPerByte: { denominator: 2, numerator: 1 },
      treasuryGrowthRate: { denominator: 2, numerator: 1 }
    };

    const ptr = Cometa.writeProtocolParameters(params);
    try {
      const readParams = Cometa.readProtocolParameters(ptr);
      expect(readParams).toEqual(params);
    } finally {
      Cometa.derefProtocolParameters(ptr);
    }
  });
});
