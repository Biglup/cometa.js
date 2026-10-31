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

/* IMPORTS *******************************************************************/

import { ProtocolParametersUpdate } from '../common';
import { getModule } from '../module';
import { assertSuccess, unrefObject } from './object';
import { readIntervalComponents, writeUnitInterval } from './unitInterval';
import { readExUnits, writeExUnits } from './exUnits';
import { readI64, splitToLowHigh64bit, readUint64Result } from './number';

/* DEFINITIONS ****************************************************************/

const fields = () => {
  const m = getModule();
  return [
    {
      key: 'maxRefScriptSizePerBlock',
      kind: 'number',
      nullable: false,
      fullGet: m.protocol_parameters_get_max_ref_script_size_per_block,
      fullSet: m.protocol_parameters_set_max_ref_script_size_per_block,
      updateGet: m.protocol_param_update_get_max_ref_script_size_per_block,
      updateSet: m.protocol_param_update_set_max_ref_script_size_per_block
    },
    {
      key: 'maxRefScriptSizePerTx',
      kind: 'number',
      nullable: false,
      fullGet: m.protocol_parameters_get_max_ref_script_size_per_tx,
      fullSet: m.protocol_parameters_set_max_ref_script_size_per_tx,
      updateGet: m.protocol_param_update_get_max_ref_script_size_per_tx,
      updateSet: m.protocol_param_update_set_max_ref_script_size_per_tx
    },
    {
      key: 'refScriptCostStride',
      kind: 'number',
      nullable: false,
      fullGet: m.protocol_parameters_get_ref_script_cost_stride,
      fullSet: m.protocol_parameters_set_ref_script_cost_stride,
      updateGet: m.protocol_param_update_get_ref_script_cost_stride,
      updateSet: m.protocol_param_update_set_ref_script_cost_stride
    },
    {
      key: 'refScriptCostMultiplier',
      kind: 'interval',
      nullable: false,
      fullGet: m.protocol_parameters_get_ref_script_cost_multiplier,
      fullSet: m.protocol_parameters_set_ref_script_cost_multiplier,
      updateGet: m.protocol_param_update_get_ref_script_cost_multiplier,
      updateSet: m.protocol_param_update_set_ref_script_cost_multiplier
    },
    {
      key: 'maxPledgeLeverage',
      kind: 'interval',
      nullable: true,
      fullGet: m.protocol_parameters_get_max_pledge_leverage,
      fullSet: m.protocol_parameters_set_max_pledge_leverage,
      updateGet: m.protocol_param_update_get_max_pledge_leverage,
      updateSet: m.protocol_param_update_set_max_pledge_leverage,
      has: m.protocol_param_update_has_max_pledge_leverage,
      setNull: m.protocol_param_update_set_max_pledge_leverage_unbounded
    },
    {
      key: 'minPoolMargin',
      kind: 'interval',
      nullable: false,
      fullGet: m.protocol_parameters_get_min_pool_margin,
      fullSet: m.protocol_parameters_set_min_pool_margin,
      updateGet: m.protocol_param_update_get_min_pool_margin,
      updateSet: m.protocol_param_update_set_min_pool_margin
    },
    {
      key: 'leiosAnnouncementPeriodLength',
      kind: 'number',
      nullable: false,
      fullGet: m.protocol_parameters_get_leios_announcement_period_length,
      fullSet: m.protocol_parameters_set_leios_announcement_period_length,
      updateGet: m.protocol_param_update_get_leios_announcement_period_length,
      updateSet: m.protocol_param_update_set_leios_announcement_period_length
    },
    {
      key: 'leiosVotePeriodLength',
      kind: 'number',
      nullable: false,
      fullGet: m.protocol_parameters_get_leios_vote_period_length,
      fullSet: m.protocol_parameters_set_leios_vote_period_length,
      updateGet: m.protocol_param_update_get_leios_vote_period_length,
      updateSet: m.protocol_param_update_set_leios_vote_period_length
    },
    {
      key: 'leiosDiffusionPeriodLength',
      kind: 'number',
      nullable: false,
      fullGet: m.protocol_parameters_get_leios_diffusion_period_length,
      fullSet: m.protocol_parameters_set_leios_diffusion_period_length,
      updateGet: m.protocol_param_update_get_leios_diffusion_period_length,
      updateSet: m.protocol_param_update_set_leios_diffusion_period_length
    },
    {
      key: 'leiosCommitteeSize',
      kind: 'number',
      nullable: false,
      fullGet: m.protocol_parameters_get_leios_committee_size,
      fullSet: m.protocol_parameters_set_leios_committee_size,
      updateGet: m.protocol_param_update_get_leios_committee_size,
      updateSet: m.protocol_param_update_set_leios_committee_size
    },
    {
      key: 'leiosQuorumStakeThreshold',
      kind: 'interval',
      nullable: false,
      fullGet: m.protocol_parameters_get_leios_quorum_stake_threshold,
      fullSet: m.protocol_parameters_set_leios_quorum_stake_threshold,
      updateGet: m.protocol_param_update_get_leios_quorum_stake_threshold,
      updateSet: m.protocol_param_update_set_leios_quorum_stake_threshold
    },
    {
      key: 'maxEndorserBlockReferencesSize',
      kind: 'number',
      nullable: false,
      fullGet: m.protocol_parameters_get_max_endorser_block_references_size,
      fullSet: m.protocol_parameters_set_max_endorser_block_references_size,
      updateGet: m.protocol_param_update_get_max_endorser_block_references_size,
      updateSet: m.protocol_param_update_set_max_endorser_block_references_size
    },
    {
      key: 'maxEndorserBlockTxsSize',
      kind: 'number',
      nullable: false,
      fullGet: m.protocol_parameters_get_max_endorser_block_txs_size,
      fullSet: m.protocol_parameters_set_max_endorser_block_txs_size,
      updateGet: m.protocol_param_update_get_max_endorser_block_txs_size,
      updateSet: m.protocol_param_update_set_max_endorser_block_txs_size
    },
    {
      key: 'maxEndorserBlockExecutionUnits',
      kind: 'exUnits',
      nullable: false,
      fullGet: m.protocol_parameters_get_max_endorser_block_execution_units,
      fullSet: m.protocol_parameters_set_max_endorser_block_execution_units,
      updateGet: m.protocol_param_update_get_max_endorser_block_execution_units,
      updateSet: m.protocol_param_update_set_max_endorser_block_execution_units
    },
    {
      key: 'maxRefScriptSizePerEndorserBlock',
      kind: 'number',
      nullable: false,
      fullGet: m.protocol_parameters_get_max_ref_script_size_per_endorser_block,
      fullSet: m.protocol_parameters_set_max_ref_script_size_per_endorser_block,
      updateGet: m.protocol_param_update_get_max_ref_script_size_per_endorser_block,
      updateSet: m.protocol_param_update_set_max_ref_script_size_per_endorser_block
    },
    {
      key: 'perasMinCandidateBlockAge',
      kind: 'number',
      nullable: false,
      fullGet: m.protocol_parameters_get_peras_min_candidate_block_age,
      fullSet: m.protocol_parameters_set_peras_min_candidate_block_age,
      updateGet: m.protocol_param_update_get_peras_min_candidate_block_age,
      updateSet: m.protocol_param_update_set_peras_min_candidate_block_age
    },
    {
      key: 'perasHealingFactor',
      kind: 'interval',
      nullable: false,
      fullGet: m.protocol_parameters_get_peras_healing_factor,
      fullSet: m.protocol_parameters_set_peras_healing_factor,
      updateGet: m.protocol_param_update_get_peras_healing_factor,
      updateSet: m.protocol_param_update_set_peras_healing_factor
    },
    {
      key: 'perasCertBoost',
      kind: 'number',
      nullable: false,
      fullGet: m.protocol_parameters_get_peras_cert_boost,
      fullSet: m.protocol_parameters_set_peras_cert_boost,
      updateGet: m.protocol_param_update_get_peras_cert_boost,
      updateSet: m.protocol_param_update_set_peras_cert_boost
    },
    {
      key: 'perasTargetCommitteeSize',
      kind: 'number',
      nullable: false,
      fullGet: m.protocol_parameters_get_peras_target_committee_size,
      fullSet: m.protocol_parameters_set_peras_target_committee_size,
      updateGet: m.protocol_param_update_get_peras_target_committee_size,
      updateSet: m.protocol_param_update_set_peras_target_committee_size
    },
    {
      key: 'perasBootstrapRound',
      kind: 'number',
      nullable: true,
      fullGet: m.protocol_parameters_get_peras_bootstrap_round,
      fullSet: m.protocol_parameters_set_peras_bootstrap_round,
      updateGet: m.protocol_param_update_get_peras_bootstrap_round,
      updateSet: m.protocol_param_update_set_peras_bootstrap_round,
      has: m.protocol_param_update_has_peras_bootstrap_round,
      setNull: m.protocol_param_update_set_peras_bootstrap_round_null
    },
    {
      key: 'perasQuorumThresholdSafetyMargin',
      kind: 'interval',
      nullable: false,
      fullGet: m.protocol_parameters_get_peras_quorum_threshold_safety_margin,
      fullSet: m.protocol_parameters_set_peras_quorum_threshold_safety_margin,
      updateGet: m.protocol_param_update_get_peras_quorum_threshold_safety_margin,
      updateSet: m.protocol_param_update_set_peras_quorum_threshold_safety_margin
    },
    {
      key: 'refInputsCostPerMultiAssetPolicy',
      kind: 'number',
      nullable: false,
      fullGet: m.protocol_parameters_get_ref_inputs_cost_per_multi_asset_policy,
      fullSet: m.protocol_parameters_set_ref_inputs_cost_per_multi_asset_policy,
      updateGet: m.protocol_param_update_get_ref_inputs_cost_per_multi_asset_policy,
      updateSet: m.protocol_param_update_set_ref_inputs_cost_per_multi_asset_policy
    },
    {
      key: 'refInputsCostPerDatumByte',
      kind: 'number',
      nullable: false,
      fullGet: m.protocol_parameters_get_ref_inputs_cost_per_datum_byte,
      fullSet: m.protocol_parameters_set_ref_inputs_cost_per_datum_byte,
      updateGet: m.protocol_param_update_get_ref_inputs_cost_per_datum_byte,
      updateSet: m.protocol_param_update_set_ref_inputs_cost_per_datum_byte
    }
  ] as const;
};

type Field = ReturnType<typeof fields>[number];

const safeNumber = (value: number, key: string): number => {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${key} must be a nonnegative safe integer.`);
  return value;
};

const writeNumberField = (ptr: number, field: Field, value: number, update: boolean): void => {
  const m = getModule();
  const { low, high } = splitToLowHigh64bit(safeNumber(value, field.key));
  if (!update && !field.nullable) {
    assertSuccess(field.fullSet(ptr, low, high));
    return;
  }
  const data = m._malloc(8);
  try {
    m.setValue(data, low, 'i32');
    m.setValue(data + 4, high, 'i32');
    assertSuccess((update ? field.updateSet : field.fullSet)(ptr, data));
  } finally {
    m._free(data);
  }
};

const writeField = (ptr: number, field: Field, value: any, update: boolean): void => {
  if (value === undefined) return;
  if (value === null) {
    if (!field.nullable) throw new TypeError(`${field.key} cannot be null.`);
    assertSuccess(update && 'setNull' in field ? field.setNull(ptr) : field.fullSet(ptr, 0));
    return;
  }
  if (field.kind === 'number') {
    writeNumberField(ptr, field, value, update);
    return;
  }
  const data = field.kind === 'interval' ? writeUnitInterval(value) : writeExUnits(value);
  try {
    assertSuccess((update ? field.updateSet : field.fullSet)(ptr, data));
  } finally {
    unrefObject(data);
  }
};

const readObject = (data: number, field: Field): any => {
  if (!data) return null;
  try {
    return field.kind === 'interval' ? readIntervalComponents(data) : readExUnits(data);
  } finally {
    unrefObject(data);
  }
};

const readUpdateField = (ptr: number, field: Field, out: number): any => {
  const m = getModule();
  const status = field.updateGet(ptr, out);
  if (status === 9) return 'has' in field && field.has(ptr) ? null : undefined;
  assertSuccess(status);
  if (field.kind === 'number') return safeNumber(Number(readI64(out)), field.key);
  return readObject(m.getValue(out, 'i32'), field);
};

const readFullField = (ptr: number, field: Field): any => {
  if (field.kind === 'number' && !field.nullable) return readUint64Result(field.fullGet, ptr) || undefined;
  const data = field.fullGet(ptr);
  if (!data) return undefined;
  if (field.kind === 'number') return safeNumber(Number(readI64(data)), field.key);
  return readObject(data, field);
};

/** @hidden */
export const writeExtendedProtocolParameters = (
  ptr: number,
  params: ProtocolParametersUpdate,
  update: boolean
): void => {
  for (const field of fields()) writeField(ptr, field, params[field.key], update);
};

/** @hidden */
export const readExtendedProtocolParameters = (ptr: number, update: boolean): ProtocolParametersUpdate => {
  const m = getModule();
  const result: ProtocolParametersUpdate = {};
  const out = m._malloc(8);
  try {
    for (const field of fields()) {
      const value = update ? readUpdateField(ptr, field, out) : readFullField(ptr, field);
      if (value !== undefined) (result as any)[field.key] = value;
    }
    return result;
  } finally {
    m._free(out);
  }
};
