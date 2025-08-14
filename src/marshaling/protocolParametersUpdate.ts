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

import { ProtocolParametersUpdate, readIntervalComponents } from '../';
import { assertSuccess, hexToBufferObject, readBufferData, unrefObject } from './object';
import { getModule } from '../module';
import { readCostModels, writeCostModels } from './costmdls';
import { readDRepVotingThresholds, writeDRepVotingThresholds } from './drepVotingThresholds';
import { readExUnitPrices, writeExUnitPrices } from './exUnitPrices';
import { readExUnits, writeExUnits } from './exUnits';
import { readPoolVotingThresholds, writePoolVotingThresholds } from './poolVotingThresholds';
import { readProtocolVersion, writeProtocolVersion } from './protocolVersion';
import { writeUnitInterval } from './unitInterval';
import { splitToLowHigh64bit } from './number';

/* DEFINITIONS ****************************************************************/

/**
 * Serializes a JavaScript `ProtocolParametersUpdate` object into a native C `cardano_protocol_param_update_t`.
 * Only the properties defined in the input object will be set in the native structure.
 *
 * @param {ProtocolParametersUpdate} params - The `ProtocolParametersUpdate` object to serialize.
 * @returns {number} A pointer to the newly created native `cardano_protocol_param_update_t` object.
 * @throws {Error} If the parameters are invalid or creation fails.
 */
// eslint-disable-next-line max-statements
export const writeProtocolParamUpdate = (params: ProtocolParametersUpdate): number => {
  const module = getModule();
  const updatePtrPtr = module._malloc(4);

  try {
    assertSuccess(module.protocol_param_update_new(updatePtrPtr), 'Failed to create protocol param update');
    const updatePtr = module.getValue(updatePtrPtr, 'i32');

    try {
      const setU64 = (setter: (ptr: number, valPtr: number) => number, value?: number | bigint) => {
        if (value === undefined) return;
        const valPtr = module._malloc(8);
        try {
          const parts = splitToLowHigh64bit(value);
          module.setValue(valPtr, parts.low, 'i32');
          module.setValue(valPtr + 4, parts.high, 'i32');
          assertSuccess(setter(updatePtr, valPtr), `Failed to set ${setter.name}`);
        } finally {
          module._free(valPtr);
        }
      };

      const setObject = (
        setter: (ptr: number, objPtr: number) => number,
        value: any,
        writer: (...args: any[]) => number
      ) => {
        if (value === undefined) return;
        const objPtr = writer(value);
        try {
          assertSuccess(setter(updatePtr, objPtr), `Failed to set ${setter.name}`);
        } finally {
          unrefObject(objPtr);
        }
      };

      setU64(module.protocol_param_update_set_min_fee_a, params.minFeeA);
      setU64(module.protocol_param_update_set_min_fee_b, params.minFeeB);
      setU64(module.protocol_param_update_set_max_block_body_size, params.maxBlockBodySize);
      setU64(module.protocol_param_update_set_max_tx_size, params.maxTxSize);
      setU64(module.protocol_param_update_set_max_block_header_size, params.maxBlockHeaderSize);
      setU64(module.protocol_param_update_set_key_deposit, params.keyDeposit);
      setU64(module.protocol_param_update_set_pool_deposit, params.poolDeposit);
      setU64(module.protocol_param_update_set_max_epoch, params.maxEpoch);
      setU64(module.protocol_param_update_set_n_opt, params.nOpt);
      setU64(module.protocol_param_update_set_min_pool_cost, params.minPoolCost);
      setU64(module.protocol_param_update_set_ada_per_utxo_byte, params.adaPerUtxoByte);
      setU64(module.protocol_param_update_set_max_value_size, params.maxValueSize);
      setU64(module.protocol_param_update_set_collateral_percentage, params.collateralPercent);
      setU64(module.protocol_param_update_set_max_collateral_inputs, params.maxCollateralInputs);
      setU64(module.protocol_param_update_set_min_committee_size, params.minCommitteeSize);
      setU64(module.protocol_param_update_set_committee_term_limit, params.committeeTermLimit);
      setU64(module.protocol_param_update_set_governance_action_validity_period, params.governanceActionValidityPeriod);
      setU64(module.protocol_param_update_set_governance_action_deposit, params.governanceActionDeposit);
      setU64(module.protocol_param_update_set_drep_deposit, params.drepDeposit);
      setU64(module.protocol_param_update_set_drep_inactivity_period, params.drepInactivityPeriod);

      setObject(module.protocol_param_update_set_pool_pledge_influence, params.poolPledgeInfluence, writeUnitInterval);
      setObject(module.protocol_param_update_set_treasury_growth_rate, params.treasuryGrowthRate, writeUnitInterval);
      setObject(module.protocol_param_update_set_expansion_rate, params.expansionRate, writeUnitInterval);
      setObject(module.protocol_param_update_set_d, params.decentralisationParam, writeUnitInterval);
      setObject(module.protocol_param_update_set_extra_entropy, params.extraEntropy, hexToBufferObject);
      setObject(module.protocol_param_update_set_protocol_version, params.protocolVersion, (pv) =>
        writeProtocolVersion(pv.major, pv.minor)
      );
      setObject(module.protocol_param_update_set_cost_models, params.costModels, writeCostModels);
      setObject(module.protocol_param_update_set_execution_costs, params.executionCosts, writeExUnitPrices);
      setObject(module.protocol_param_update_set_max_tx_ex_units, params.maxTxExUnits, writeExUnits);
      setObject(module.protocol_param_update_set_max_block_ex_units, params.maxBlockExUnits, writeExUnits);
      setObject(
        module.protocol_param_update_set_pool_voting_thresholds,
        params.poolVotingThresholds,
        writePoolVotingThresholds
      );
      setObject(
        module.protocol_param_update_set_drep_voting_thresholds,
        params.drepVotingThresholds,
        writeDRepVotingThresholds
      );
      setObject(
        module.protocol_param_update_set_ref_script_cost_per_byte,
        params.refScriptCostPerByte,
        writeUnitInterval
      );

      return updatePtr;
    } catch (error) {
      unrefObject(updatePtr);
      throw error;
    }
  } finally {
    module._free(updatePtrPtr);
  }
};

/**
 * Deserializes a native `cardano_protocol_param_update_t` object into a JavaScript `ProtocolParametersUpdate` object.
 * Only the properties present in the native structure will be included in the returned object.
 *
 * @param {number} ptr - A pointer to the native `cardano_protocol_param_update_t` object.
 * @returns {ProtocolParametersUpdate} The deserialized JavaScript `ProtocolParametersUpdate` object.
 */
// eslint-disable-next-line max-statements
export const readProtocolParamUpdate = (ptr: number): ProtocolParametersUpdate => {
  const module = getModule();
  const CARDANO_SUCCESS = 0;
  const CARDANO_ERROR_ELEMENT_NOT_FOUND = 9;
  const result: ProtocolParametersUpdate = {};

  const getU64 = (getter: (ptr: number, outPtr: number) => number): number | undefined => {
    const outPtr = module._malloc(8);
    try {
      const res = getter(ptr, outPtr);
      if (res === CARDANO_SUCCESS) {
        const low = module.getValue(outPtr, 'i32') >>> 0;
        const high = module.getValue(outPtr + 4, 'i32');
        return (high << 32) | low;
      }
      if (res !== CARDANO_ERROR_ELEMENT_NOT_FOUND) assertSuccess(res, `Failed to get value from ${getter.name}`);
      return undefined;
    } finally {
      module._free(outPtr);
    }
  };

  const getObject = <T>(
    getter: (ptr: number, outPtr: number) => number,
    reader: (objPtr: number) => T
  ): T | undefined => {
    const outPtrPtr = module._malloc(4);
    let objPtr = 0;
    try {
      const res = getter(ptr, outPtrPtr);
      if (res === CARDANO_SUCCESS) {
        objPtr = module.getValue(outPtrPtr, 'i32');
        return reader(objPtr);
      }
      if (res !== CARDANO_ERROR_ELEMENT_NOT_FOUND) assertSuccess(res);
      return undefined;
    } finally {
      if (objPtr) unrefObject(objPtr);
      module._free(outPtrPtr);
    }
  };

  result.minFeeA = getU64(module.protocol_param_update_get_min_fee_a) as number | undefined;
  result.minFeeB = getU64(module.protocol_param_update_get_min_fee_b) as number | undefined;
  result.maxBlockBodySize = getU64(module.protocol_param_update_get_max_block_body_size) as number | undefined;
  result.maxTxSize = getU64(module.protocol_param_update_get_max_tx_size) as number | undefined;
  result.maxBlockHeaderSize = getU64(module.protocol_param_update_get_max_block_header_size) as number | undefined;
  result.keyDeposit = getU64(module.protocol_param_update_get_key_deposit) as number | undefined;
  result.poolDeposit = getU64(module.protocol_param_update_get_pool_deposit) as number | undefined;
  result.maxEpoch = getU64(module.protocol_param_update_get_max_epoch) as number | undefined;
  result.nOpt = getU64(module.protocol_param_update_get_n_opt) as number | undefined;
  result.minPoolCost = getU64(module.protocol_param_update_get_min_pool_cost) as number | undefined;
  result.adaPerUtxoByte = getU64(module.protocol_param_update_get_ada_per_utxo_byte) as number | undefined;
  result.maxValueSize = getU64(module.protocol_param_update_get_max_value_size) as number | undefined;
  result.collateralPercent = getU64(module.protocol_param_update_get_collateral_percentage) as number | undefined;
  result.maxCollateralInputs = getU64(module.protocol_param_update_get_max_collateral_inputs) as number | undefined;
  result.minCommitteeSize = getU64(module.protocol_param_update_get_min_committee_size) as number | undefined;
  result.committeeTermLimit = getU64(module.protocol_param_update_get_committee_term_limit) as number | undefined;
  result.governanceActionValidityPeriod = getU64(module.protocol_param_update_get_governance_action_validity_period) as
    | number
    | undefined;
  result.governanceActionDeposit = getU64(module.protocol_param_update_get_governance_action_deposit) as
    | number
    | undefined;
  result.drepDeposit = getU64(module.protocol_param_update_get_drep_deposit) as number | undefined;
  result.drepInactivityPeriod = getU64(module.protocol_param_update_get_drep_inactivity_period) as number | undefined;
  result.poolPledgeInfluence = getObject(
    module.protocol_param_update_get_pool_pledge_influence,
    readIntervalComponents
  );
  result.treasuryGrowthRate = getObject(module.protocol_param_update_get_treasury_growth_rate, readIntervalComponents);
  result.expansionRate = getObject(module.protocol_param_update_get_expansion_rate, readIntervalComponents);
  result.decentralisationParam = getObject(module.protocol_param_update_get_d, readIntervalComponents);
  result.extraEntropy =
    getObject(module.protocol_param_update_get_extra_entropy, (p) => Buffer.from(readBufferData(p)).toString('hex')) ||
    undefined;
  result.protocolVersion = getObject(module.protocol_param_update_get_protocol_version, readProtocolVersion);
  result.costModels = getObject(module.protocol_param_update_get_cost_models, readCostModels);
  result.executionCosts = getObject(module.protocol_param_update_get_execution_costs, readExUnitPrices);
  result.maxTxExUnits = getObject(module.protocol_param_update_get_max_tx_ex_units, readExUnits);
  result.maxBlockExUnits = getObject(module.protocol_param_update_get_max_block_ex_units, readExUnits);
  result.poolVotingThresholds = getObject(
    module.protocol_param_update_get_pool_voting_thresholds,
    readPoolVotingThresholds
  );
  result.drepVotingThresholds = getObject(
    module.protocol_param_update_get_drep_voting_thresholds,
    readDRepVotingThresholds
  );
  result.refScriptCostPerByte = getObject(
    module.protocol_param_update_get_ref_script_cost_per_byte,
    readIntervalComponents
  );

  return result;
};
