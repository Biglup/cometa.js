/**
 * Copyright 2025 Biglup Labs.
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

/* IMPORTS ******************************************************************/

import { CostModel } from './CostModel';
import { DRepThresholds } from './DRepThresholds';
import { ExUnits } from './ExUnits';
import { ExUnitsPrices } from './ExUnitsPrices';
import { PoolVotingThresholds } from './PoolVotingThresholds';
import { ProtocolVersion } from './ProtocolVersion';
import { UnitInterval } from './UnitInterval';

/* DEFINITIONS **************************************************************/

/**
 * Interface representing the protocol parameters of the Cardano blockchain.
 * These parameters define the rules and limits for transactions, blocks, and governance actions.
 */
export interface ProtocolParameters {
  minFeeA: number;
  minFeeB: number;
  maxBlockBodySize: number;
  maxTxSize: number;
  maxBlockHeaderSize: number;
  keyDeposit: number;
  poolDeposit: number;
  maxEpoch: number;
  nOpt: number;
  poolPledgeInfluence: UnitInterval;
  treasuryGrowthRate: UnitInterval;
  expansionRate: UnitInterval;
  decentralisationParam: UnitInterval;
  extraEntropy: string | null;
  protocolVersion: ProtocolVersion;
  minPoolCost: number;
  adaPerUtxoByte: number;
  costModels: CostModel[];
  executionCosts: ExUnitsPrices;
  maxTxExUnits: ExUnits;
  maxBlockExUnits: ExUnits;
  maxValueSize: number;
  collateralPercent: number;
  maxCollateralInputs: number;
  poolVotingThresholds: PoolVotingThresholds;
  drepVotingThresholds: DRepThresholds;
  minCommitteeSize: number;
  committeeTermLimit: number;
  governanceActionValidityPeriod: number;
  governanceActionDeposit: number;
  drepDeposit: number;
  drepInactivityPeriod: number;
  refScriptCostPerByte: UnitInterval;
}

/**
 * Type representing an update to the protocol parameters.
 * This allows for partial updates to the existing protocol parameters.
 */
export type ProtocolParametersUpdate = Partial<ProtocolParameters>;
