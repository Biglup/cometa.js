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

/* IMPORTS ********************************************************************/

import { ProtocolParameters } from '../../common';
import { array, integer, invalid, natural, object, ratio, string } from './Values';

/* DEFINITIONS ****************************************************************/

/** @internal Governance thresholds and monetary rates must lie in [0, 1]. */
const interval = (value: unknown) => {
  const result = ratio(value);
  if (result.numerator > result.denominator) return invalid();
  return result;
};

/** @internal Decode the full Conway protocol snapshot in Ogmios spelling. */
export const protocolParameters = (value: unknown): ProtocolParameters => {
  const source = object(value);
  const at = (entry: unknown, name: string): unknown => object(entry)[name];
  const get = (name: string): unknown => source[name];
  const money = (name: string) => natural(object(object(get(name)).ada).lovelace);
  const bytes = (name: string) => natural(object(get(name)).bytes);
  const units = (name: string) => ({
    memory: natural(object(get(name)).memory),
    steps: natural(object(get(name)).cpu)
  });
  const version = object(get('version'));
  const prices = object(get('scriptExecutionPrices'));
  const pool = get('stakePoolVotingThresholds');
  const drep = get('delegateRepresentativeVotingThresholds');
  const poolCommittee = at(pool, 'constitutionalCommittee');
  const drepCommittee = at(drep, 'constitutionalCommittee');
  const poolParameters = at(pool, 'protocolParametersUpdate');
  const drepParameters = at(drep, 'protocolParametersUpdate');
  const models = object(get('plutusCostModels'));
  const names: Record<string, string> = {
    'plutus:v1': 'PlutusV1',
    'plutus:v2': 'PlutusV2',
    'plutus:v3': 'PlutusV3',
    'plutus:v4': 'PlutusV4'
  };
  const costModels = Object.entries(models).map(([language, costs]) => ({
    costs: array(costs).map((cost) =>
      Number(integer(cost, BigInt(Number.MIN_SAFE_INTEGER), BigInt(Number.MAX_SAFE_INTEGER)))
    ),
    language: string(names[language])
  }));

  return {
    adaPerUtxoByte: natural(get('minUtxoDepositCoefficient')),
    collateralPercent: natural(get('collateralPercentage')),
    committeeTermLimit: natural(get('constitutionalCommitteeMaxTermLength')),
    costModels,
    decentralisationParam: { denominator: 1, numerator: 0 },
    drepDeposit: money('delegateRepresentativeDeposit'),
    drepInactivityPeriod: natural(get('delegateRepresentativeMaxIdleTime')),
    drepVotingThresholds: {
      committeeNoConfidence: interval(at(drepCommittee, 'stateOfNoConfidence')),
      committeeNormal: interval(at(drepCommittee, 'default')),
      hardForkInitiation: interval(at(drep, 'hardForkInitiation')),
      motionNoConfidence: interval(at(drep, 'noConfidence')),
      ppEconomicGroup: interval(at(drepParameters, 'economic')),
      ppGovernanceGroup: interval(at(drepParameters, 'governance')),
      ppNetworkGroup: interval(at(drepParameters, 'network')),
      ppTechnicalGroup: interval(at(drepParameters, 'technical')),
      treasuryWithdrawal: interval(at(drep, 'treasuryWithdrawals')),
      updateConstitution: interval(at(drep, 'constitution'))
    },
    executionCosts: { memory: ratio(prices.memory), steps: ratio(prices.cpu) },
    expansionRate: interval(get('monetaryExpansion')),
    extraEntropy: null,
    governanceActionDeposit: money('governanceActionDeposit'),
    governanceActionValidityPeriod: natural(get('governanceActionLifetime')),
    keyDeposit: money('stakeCredentialDeposit'),
    maxBlockBodySize: bytes('maxBlockBodySize'),
    maxBlockExUnits: units('maxExecutionUnitsPerBlock'),
    maxBlockHeaderSize: bytes('maxBlockHeaderSize'),
    maxCollateralInputs: natural(get('maxCollateralInputs')),
    maxEpoch: natural(get('stakePoolRetirementEpochBound')),
    maxTxExUnits: units('maxExecutionUnitsPerTransaction'),
    maxTxSize: bytes('maxTransactionSize'),
    maxValueSize: bytes('maxValueSize'),
    minCommitteeSize: natural(get('constitutionalCommitteeMinSize')),
    minFeeA: natural(get('minFeeCoefficient')),
    minFeeB: money('minFeeConstant'),
    minPoolCost: money('minStakePoolCost'),
    nOpt: natural(get('desiredNumberOfStakePools')),
    poolDeposit: money('stakePoolDeposit'),
    poolPledgeInfluence: ratio(get('stakePoolPledgeInfluence')),
    poolVotingThresholds: {
      committeeNoConfidence: interval(at(poolCommittee, 'stateOfNoConfidence')),
      committeeNormal: interval(at(poolCommittee, 'default')),
      hardForkInitiation: interval(at(pool, 'hardForkInitiation')),
      motionNoConfidence: interval(at(pool, 'noConfidence')),
      securityRelevantParamVotingThreshold: interval(at(poolParameters, 'security'))
    },
    protocolVersion: { major: natural(version.major), minor: natural(version.minor) },
    refScriptCostMultiplier: ratio(object(get('minFeeReferenceScripts')).multiplier),
    refScriptCostPerByte: ratio(object(get('minFeeReferenceScripts')).base),
    refScriptCostStride: natural(object(get('minFeeReferenceScripts')).range),
    treasuryGrowthRate: interval(get('treasuryExpansion')),
    ...(get('maxReferenceScriptsSizePerTransaction') !== undefined
      ? { maxRefScriptSizePerTx: bytes('maxReferenceScriptsSizePerTransaction') }
      : {}),
    ...(get('maxReferenceScriptsSizePerBlock') !== undefined
      ? { maxRefScriptSizePerBlock: bytes('maxReferenceScriptsSizePerBlock') }
      : {})
  };
};
