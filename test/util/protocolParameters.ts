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

import { ProtocolParameters } from '../../dist/cjs';

export const params: ProtocolParameters = {
  adaPerUtxoByte: 4310,
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
  maxTxSize: 16384,
  maxValueSize: 5000,
  minCommitteeSize: 15,
  minFeeA: 44,
  minFeeB: 155381,
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
  protocolVersion: { major: 10, minor: 0 },
  refScriptCostPerByte: { denominator: 2, numerator: 1 },
  treasuryGrowthRate: { denominator: 2, numerator: 1 }
};
