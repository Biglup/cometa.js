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

import { ProtocolParameters } from '../common/ProtocolParameters';
import { assertSuccess, hexToBufferObject, readBufferData, unrefObject } from './object';
import { derefCostModels, readCostModels, writeCostModels } from './costmdls';
import { derefDRepVotingThresholds, readDRepVotingThresholds, writeDRepVotingThresholds } from './drepVotingThresholds';
import { derefExUnitPrices, readExUnitPrices, writeExUnitPrices } from './exUnitPrices';
import { derefExUnits, readExUnits, writeExUnits } from './exUnits';
import { derefPoolVotingThresholds, readPoolVotingThresholds, writePoolVotingThresholds } from './poolVotingThresholds';
import { derefProtocolVersion, readProtocolVersion, writeProtocolVersion } from './protocolVersion';
import { derefUnitInterval, readIntervalComponents, writeUnitInterval } from './unitInterval';
import { getModule } from '../module';
import { splitToLowHigh64bit } from './number';
import { uint8ArrayToHex } from '../cometa';

/* DEFINITIONS ****************************************************************/

/**
 * @hidden
 * Writes a ProtocolParameters object to WASM memory.
 *
 * @param params - The ProtocolParameters object to write.
 * @returns A pointer to the created protocol parameters in WASM memory.
 * @throws {Error} If the parameters are invalid or creation fails.
 */
// eslint-disable-next-line max-statements
export const writeProtocolParameters = (params: ProtocolParameters): number => {
  const module = getModule();
  const paramsPtrPtr = module._malloc(4);

  try {
    // Create empty protocol parameters
    const result = module.protocol_parameters_new(paramsPtrPtr);
    assertSuccess(result, 'Failed to create protocol parameters');
    const paramsPtr = module.getValue(paramsPtrPtr, 'i32');

    try {
      // Set all parameters using setter functions
      const minFeeA = splitToLowHigh64bit(params.minFeeA);
      let setResult = module.protocol_parameters_set_min_fee_a(paramsPtr, minFeeA.low, minFeeA.high);
      assertSuccess(setResult, 'Failed to set min fee A');

      const minFeeB = splitToLowHigh64bit(params.minFeeB);
      setResult = module.protocol_parameters_set_min_fee_b(paramsPtr, minFeeB.low, minFeeB.high);
      assertSuccess(setResult, 'Failed to set min fee B');

      const maxBlockBodySize = splitToLowHigh64bit(params.maxBlockBodySize);
      setResult = module.protocol_parameters_set_max_block_body_size(
        paramsPtr,
        maxBlockBodySize.low,
        maxBlockBodySize.high
      );
      assertSuccess(setResult, 'Failed to set max block body size');

      const maxTxSize = splitToLowHigh64bit(params.maxTxSize);
      setResult = module.protocol_parameters_set_max_tx_size(paramsPtr, maxTxSize.low, maxTxSize.high);
      assertSuccess(setResult, 'Failed to set max tx size');

      const maxBlockHeaderSize = splitToLowHigh64bit(params.maxBlockHeaderSize);
      setResult = module.protocol_parameters_set_max_block_header_size(
        paramsPtr,
        maxBlockHeaderSize.low,
        maxBlockHeaderSize.high
      );
      assertSuccess(setResult, 'Failed to set max block header size');

      const keyDeposit = splitToLowHigh64bit(params.keyDeposit);
      setResult = module.protocol_parameters_set_key_deposit(paramsPtr, keyDeposit.low, keyDeposit.high);
      assertSuccess(setResult, 'Failed to set key deposit');

      const poolDeposit = splitToLowHigh64bit(params.poolDeposit);
      setResult = module.protocol_parameters_set_pool_deposit(paramsPtr, poolDeposit.low, poolDeposit.high);
      assertSuccess(setResult, 'Failed to set pool deposit');

      const maxEpoch = splitToLowHigh64bit(params.maxEpoch);
      setResult = module.protocol_parameters_set_max_epoch(paramsPtr, maxEpoch.low, maxEpoch.high);
      assertSuccess(setResult, 'Failed to set max epoch');

      const nOpt = splitToLowHigh64bit(params.nOpt);
      setResult = module.protocol_parameters_set_n_opt(paramsPtr, nOpt.low, nOpt.high);
      assertSuccess(setResult, 'Failed to set n opt');

      const poolPledgeInfluencePtr = writeUnitInterval(params.poolPledgeInfluence);
      try {
        setResult = module.protocol_parameters_set_pool_pledge_influence(paramsPtr, poolPledgeInfluencePtr);
        assertSuccess(setResult, 'Failed to set pool pledge influence');
      } finally {
        derefUnitInterval(poolPledgeInfluencePtr);
      }

      const treasuryGrowthRatePtr = writeUnitInterval(params.treasuryGrowthRate);
      try {
        setResult = module.protocol_parameters_set_treasury_growth_rate(paramsPtr, treasuryGrowthRatePtr);
        assertSuccess(setResult, 'Failed to set treasury growth rate');
      } finally {
        derefUnitInterval(treasuryGrowthRatePtr);
      }

      const expansionRatePtr = writeUnitInterval(params.expansionRate);
      try {
        setResult = module.protocol_parameters_set_expansion_rate(paramsPtr, expansionRatePtr);
        assertSuccess(setResult, 'Failed to set expansion rate');
      } finally {
        derefUnitInterval(expansionRatePtr);
      }

      const decentralisationParamPtr = writeUnitInterval(params.decentralisationParam);
      try {
        setResult = module.protocol_parameters_set_d(paramsPtr, decentralisationParamPtr);
        assertSuccess(setResult, 'Failed to set decentralisation param');
      } finally {
        derefUnitInterval(decentralisationParamPtr);
      }

      if (params.extraEntropy) {
        const extraEntropyPtr = hexToBufferObject(params.extraEntropy);
        try {
          setResult = module.protocol_parameters_set_extra_entropy(paramsPtr, extraEntropyPtr);
          assertSuccess(setResult, 'Failed to set extra entropy');
        } finally {
          unrefObject(extraEntropyPtr);
        }
      }

      const protocolVersionPtr = writeProtocolVersion(params.protocolVersion.major, params.protocolVersion.minor);
      try {
        setResult = module.protocol_parameters_set_protocol_version(paramsPtr, protocolVersionPtr);
        assertSuccess(setResult, 'Failed to set protocol version');
      } finally {
        derefProtocolVersion(protocolVersionPtr);
      }

      const minPoolCost = splitToLowHigh64bit(params.minPoolCost);
      setResult = module.protocol_parameters_set_min_pool_cost(paramsPtr, minPoolCost.low, minPoolCost.high);
      assertSuccess(setResult, 'Failed to set min pool cost');

      const adaPerUtxoByte = splitToLowHigh64bit(params.adaPerUtxoByte);
      setResult = module.protocol_parameters_set_ada_per_utxo_byte(paramsPtr, adaPerUtxoByte.low, adaPerUtxoByte.high);
      assertSuccess(setResult, 'Failed to set ada per utxo byte');

      const costModelsPtr = writeCostModels(params.costModels);
      try {
        setResult = module.protocol_parameters_set_cost_models(paramsPtr, costModelsPtr);
        assertSuccess(setResult, 'Failed to set cost models');
      } finally {
        derefCostModels(costModelsPtr);
      }

      const executionCostsPtr = writeExUnitPrices(params.executionCosts);
      try {
        setResult = module.protocol_parameters_set_execution_costs(paramsPtr, executionCostsPtr);
        assertSuccess(setResult, 'Failed to set execution costs');
      } finally {
        derefExUnitPrices(executionCostsPtr);
      }

      const maxTxExUnitsPtr = writeExUnits(params.maxTxExUnits);
      try {
        setResult = module.protocol_parameters_set_max_tx_ex_units(paramsPtr, maxTxExUnitsPtr);
        assertSuccess(setResult, 'Failed to set max tx ex units');
      } finally {
        derefExUnits(maxTxExUnitsPtr);
      }

      const maxBlockExUnitsPtr = writeExUnits(params.maxBlockExUnits);
      try {
        setResult = module.protocol_parameters_set_max_block_ex_units(paramsPtr, maxBlockExUnitsPtr);
        assertSuccess(setResult, 'Failed to set max block ex units');
      } finally {
        derefExUnits(maxBlockExUnitsPtr);
      }

      const maxValueSize = splitToLowHigh64bit(params.maxValueSize);
      setResult = module.protocol_parameters_set_max_value_size(paramsPtr, maxValueSize.low, maxValueSize.high);
      assertSuccess(setResult, 'Failed to set max value size');

      const collateralPercent = splitToLowHigh64bit(params.collateralPercent);
      setResult = module.protocol_parameters_set_collateral_percentage(
        paramsPtr,
        collateralPercent.low,
        collateralPercent.high
      );
      assertSuccess(setResult, 'Failed to set collateral percent');

      const maxCollateralInputs = splitToLowHigh64bit(params.maxCollateralInputs);
      setResult = module.protocol_parameters_set_max_collateral_inputs(
        paramsPtr,
        maxCollateralInputs.low,
        maxCollateralInputs.high
      );
      assertSuccess(setResult, 'Failed to set max collateral inputs');

      const poolVotingThresholdsPtr = writePoolVotingThresholds(params.poolVotingThresholds);
      try {
        setResult = module.protocol_parameters_set_pool_voting_thresholds(paramsPtr, poolVotingThresholdsPtr);
        assertSuccess(setResult, 'Failed to set pool voting thresholds');
      } finally {
        derefPoolVotingThresholds(poolVotingThresholdsPtr);
      }

      const drepVotingThresholdsPtr = writeDRepVotingThresholds(params.drepVotingThresholds);
      try {
        setResult = module.protocol_parameters_set_drep_voting_thresholds(paramsPtr, drepVotingThresholdsPtr);
        assertSuccess(setResult, 'Failed to set DRep voting thresholds');
      } finally {
        derefDRepVotingThresholds(drepVotingThresholdsPtr);
      }

      const minCommitteeSize = splitToLowHigh64bit(params.minCommitteeSize);
      setResult = module.protocol_parameters_set_min_committee_size(
        paramsPtr,
        minCommitteeSize.low,
        minCommitteeSize.high
      );
      assertSuccess(setResult, 'Failed to set min committee size');

      const committeeTermLimit = splitToLowHigh64bit(params.committeeTermLimit);
      setResult = module.protocol_parameters_set_committee_term_limit(
        paramsPtr,
        committeeTermLimit.low,
        committeeTermLimit.high
      );
      assertSuccess(setResult, 'Failed to set committee term limit');

      const governanceActionValidityPeriod = splitToLowHigh64bit(params.governanceActionValidityPeriod);
      setResult = module.protocol_parameters_set_governance_action_validity_period(
        paramsPtr,
        governanceActionValidityPeriod.low,
        governanceActionValidityPeriod.high
      );
      assertSuccess(setResult, 'Failed to set governance action validity period');

      const governanceActionDeposit = splitToLowHigh64bit(params.governanceActionDeposit);
      setResult = module.protocol_parameters_set_governance_action_deposit(
        paramsPtr,
        governanceActionDeposit.low,
        governanceActionDeposit.high
      );
      assertSuccess(setResult, 'Failed to set governance action deposit');

      const drepDeposit = splitToLowHigh64bit(params.drepDeposit);
      setResult = module.protocol_parameters_set_drep_deposit(paramsPtr, drepDeposit.low, drepDeposit.high);
      assertSuccess(setResult, 'Failed to set DRep deposit');

      const drepInactivityPeriod = splitToLowHigh64bit(params.drepInactivityPeriod);
      setResult = module.protocol_parameters_set_drep_inactivity_period(
        paramsPtr,
        drepInactivityPeriod.low,
        drepInactivityPeriod.high
      );
      assertSuccess(setResult, 'Failed to set DRep inactivity period');

      const refScriptCostPerBytePtr = writeUnitInterval(params.refScriptCostPerByte);
      try {
        setResult = module.protocol_parameters_set_ref_script_cost_per_byte(paramsPtr, refScriptCostPerBytePtr);
        assertSuccess(setResult, 'Failed to set ref script cost per byte');
      } finally {
        derefUnitInterval(refScriptCostPerBytePtr);
      }

      return paramsPtr;
    } catch (error) {
      unrefObject(paramsPtr);
      throw error;
    }
  } finally {
    module._free(paramsPtrPtr);
  }
};

/**
 * @hidden
 * Reads a ProtocolParameters object from a pointer in WASM memory.
 *
 * @param ptr - The pointer to the protocol parameters in WASM memory.
 * @returns The ProtocolParameters object.
 * @throws {Error} If the pointer is null or reading fails.
 */
// eslint-disable-next-line max-statements
export const readProtocolParameters = (ptr: number): ProtocolParameters => {
  if (!ptr) {
    throw new Error('Pointer is null');
  }

  const module = getModule();
  const valuePtrPtr = module._malloc(4);
  try {
    const minFeeA = module.protocol_parameters_get_min_fee_a(ptr);
    const minFeeB = module.protocol_parameters_get_min_fee_b(ptr);
    const maxBlockBodySize = module.protocol_parameters_get_max_block_body_size(ptr);
    const maxTxSize = module.protocol_parameters_get_max_tx_size(ptr);
    const maxBlockHeaderSize = module.protocol_parameters_get_max_block_header_size(ptr);
    const keyDeposit = module.protocol_parameters_get_key_deposit(ptr);
    const poolDeposit = module.protocol_parameters_get_pool_deposit(ptr);
    const maxEpoch = module.protocol_parameters_get_max_epoch(ptr);
    const nOpt = module.protocol_parameters_get_n_opt(ptr);

    let obj = module.protocol_parameters_get_pool_pledge_influence(ptr);
    const poolPledgeInfluence = readIntervalComponents(obj);
    derefUnitInterval(obj);

    obj = module.protocol_parameters_get_treasury_growth_rate(ptr);
    const treasuryGrowthRate = readIntervalComponents(obj);
    derefUnitInterval(obj);

    obj = module.protocol_parameters_get_expansion_rate(ptr);
    const expansionRate = readIntervalComponents(obj);
    derefUnitInterval(obj);

    obj = module.protocol_parameters_get_d(ptr);
    const decentralisationParam = readIntervalComponents(obj);
    derefUnitInterval(obj);

    let extraEntropy = null;
    obj = module.protocol_parameters_get_extra_entropy(ptr);
    if (obj) {
      extraEntropy = uint8ArrayToHex(readBufferData(obj));

      if (extraEntropy.length === 0) extraEntropy = null;
    }

    obj = module.protocol_parameters_get_protocol_version(ptr);
    const protocolVersion = readProtocolVersion(obj);
    derefProtocolVersion(obj);

    const minPoolCost = module.protocol_parameters_get_min_pool_cost(ptr);
    const adaPerUtxoByte = module.protocol_parameters_get_ada_per_utxo_byte(ptr);

    obj = module.protocol_parameters_get_cost_models(ptr);
    const costModels = readCostModels(obj);
    derefCostModels(obj);

    obj = module.protocol_parameters_get_execution_costs(ptr);
    const executionCosts = readExUnitPrices(obj);
    derefExUnitPrices(obj);

    obj = module.protocol_parameters_get_max_tx_ex_units(ptr);
    const maxTxExUnits = readExUnits(obj);
    derefExUnits(obj);

    obj = module.protocol_parameters_get_max_block_ex_units(ptr);
    const maxBlockExUnits = readExUnits(obj);
    derefExUnits(obj);

    const maxValueSize = module.protocol_parameters_get_max_value_size(ptr);
    const collateralPercent = module.protocol_parameters_get_collateral_percentage(ptr);
    const maxCollateralInputs = module.protocol_parameters_get_max_collateral_inputs(ptr);

    obj = module.protocol_parameters_get_pool_voting_thresholds(ptr);
    const poolVotingThresholds = readPoolVotingThresholds(obj);
    derefPoolVotingThresholds(obj);

    obj = module.protocol_parameters_get_drep_voting_thresholds(ptr);
    const drepVotingThresholds = readDRepVotingThresholds(obj);
    derefDRepVotingThresholds(obj);

    const minCommitteeSize = module.protocol_parameters_get_min_committee_size(ptr);
    const committeeTermLimit = module.protocol_parameters_get_committee_term_limit(ptr);
    const governanceActionValidityPeriod = module.protocol_parameters_get_governance_action_validity_period(ptr);
    const governanceActionDeposit = module.protocol_parameters_get_governance_action_deposit(ptr);
    const drepDeposit = module.protocol_parameters_get_drep_deposit(ptr);
    const drepInactivityPeriod = module.protocol_parameters_get_drep_inactivity_period(ptr);

    obj = module.protocol_parameters_get_ref_script_cost_per_byte(ptr);
    const refScriptCostPerByte = readIntervalComponents(obj);
    derefUnitInterval(obj);

    return {
      adaPerUtxoByte,
      collateralPercent,
      committeeTermLimit,
      costModels,
      decentralisationParam,
      drepDeposit,
      drepInactivityPeriod,
      drepVotingThresholds,
      executionCosts,
      expansionRate,
      extraEntropy,
      governanceActionDeposit,
      governanceActionValidityPeriod,
      keyDeposit,
      maxBlockBodySize,
      maxBlockExUnits,
      maxBlockHeaderSize,
      maxCollateralInputs,
      maxEpoch,
      maxTxExUnits,
      maxTxSize,
      maxValueSize,
      minCommitteeSize,
      minFeeA,
      minFeeB,
      minPoolCost,
      nOpt,
      poolDeposit,
      poolPledgeInfluence,
      poolVotingThresholds,
      protocolVersion,
      refScriptCostPerByte,
      treasuryGrowthRate
    };
  } finally {
    module._free(valuePtrPtr);
  }
};

/**
 * @hidden
 * Dereferences a protocol parameters pointer, freeing its memory.
 *
 * @param ptr - The pointer to the protocol parameters in WASM memory.
 * @throws {Error} If the pointer is null or dereferencing fails.
 */
export const derefProtocolParameters = (ptr: number): void => {
  if (!ptr) {
    throw new Error('Pointer is null');
  }

  const module = getModule();
  const ptrPtr = module._malloc(4);
  try {
    module.setValue(ptrPtr, ptr, '*');
    module.protocol_parameters_unref(ptrPtr);
  } finally {
    module._free(ptrPtr);
  }
};
