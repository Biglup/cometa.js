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

import { ProtocolParameters, UTxO, cborToPlutusData, cborToScript } from '../../common';
import { addressText, datumBytes } from './Outputs';
import { hex, input, integer, invalid, natural, object, string, uniqueOutputs } from './Values';
import { protocolParameters } from './Protocol';

const fields: Record<string, string> = {
  collateralPercentage: 'collateralPercentage',
  constitutionalCommitteeMaxTermLength: 'committeeMaxTermLength',
  constitutionalCommitteeMinSize: 'committeeMinSize',
  'delegateRepresentativeDeposit.ada.lovelace': 'dRepDeposit',
  delegateRepresentativeMaxIdleTime: 'dRepActivity',
  'delegateRepresentativeVotingThresholds.constitution': 'dRepVotingThresholds.updateToConstitution',
  'delegateRepresentativeVotingThresholds.constitutionalCommittee.default': 'dRepVotingThresholds.committeeNormal',
  'delegateRepresentativeVotingThresholds.constitutionalCommittee.stateOfNoConfidence':
    'dRepVotingThresholds.committeeNoConfidence',
  'delegateRepresentativeVotingThresholds.hardForkInitiation': 'dRepVotingThresholds.hardForkInitiation',
  'delegateRepresentativeVotingThresholds.noConfidence': 'dRepVotingThresholds.motionNoConfidence',
  'delegateRepresentativeVotingThresholds.protocolParametersUpdate.economic': 'dRepVotingThresholds.ppEconomicGroup',
  'delegateRepresentativeVotingThresholds.protocolParametersUpdate.governance': 'dRepVotingThresholds.ppGovGroup',
  'delegateRepresentativeVotingThresholds.protocolParametersUpdate.network': 'dRepVotingThresholds.ppNetworkGroup',
  'delegateRepresentativeVotingThresholds.protocolParametersUpdate.technical': 'dRepVotingThresholds.ppTechnicalGroup',
  'delegateRepresentativeVotingThresholds.treasuryWithdrawals': 'dRepVotingThresholds.treasuryWithdrawal',
  desiredNumberOfStakePools: 'stakePoolTargetNum',
  'governanceActionDeposit.ada.lovelace': 'govActionDeposit',
  governanceActionLifetime: 'govActionLifetime',
  'maxBlockBodySize.bytes': 'maxBlockBodySize',
  'maxBlockHeaderSize.bytes': 'maxBlockHeaderSize',
  maxCollateralInputs: 'maxCollateralInputs',
  'maxExecutionUnitsPerBlock.cpu': 'maxBlockExecutionUnits.steps',
  'maxExecutionUnitsPerBlock.memory': 'maxBlockExecutionUnits.memory',
  'maxExecutionUnitsPerTransaction.cpu': 'maxTxExecutionUnits.steps',
  'maxExecutionUnitsPerTransaction.memory': 'maxTxExecutionUnits.memory',
  'maxTransactionSize.bytes': 'maxTxSize',
  'maxValueSize.bytes': 'maxValueSize',
  minFeeCoefficient: 'txFeePerByte',
  'minFeeConstant.ada.lovelace': 'txFeeFixed',
  'minFeeReferenceScripts.base': 'minFeeRefScriptCostPerByte',
  'minStakePoolCost.ada.lovelace': 'minPoolCost',
  minUtxoDepositCoefficient: 'utxoCostPerByte',
  monetaryExpansion: 'monetaryExpansion',
  'scriptExecutionPrices.cpu': 'executionUnitPrices.priceSteps',
  'scriptExecutionPrices.memory': 'executionUnitPrices.priceMemory',
  'stakeCredentialDeposit.ada.lovelace': 'stakeAddressDeposit',
  'stakePoolDeposit.ada.lovelace': 'stakePoolDeposit',
  stakePoolPledgeInfluence: 'poolPledgeInfluence',
  stakePoolRetirementEpochBound: 'poolRetireMaxEpoch',
  'stakePoolVotingThresholds.constitutionalCommittee.default': 'poolVotingThresholds.committeeNormal',
  'stakePoolVotingThresholds.constitutionalCommittee.stateOfNoConfidence': 'poolVotingThresholds.committeeNoConfidence',
  'stakePoolVotingThresholds.hardForkInitiation': 'poolVotingThresholds.hardForkInitiation',
  'stakePoolVotingThresholds.noConfidence': 'poolVotingThresholds.motionNoConfidence',
  'stakePoolVotingThresholds.protocolParametersUpdate.security': 'poolVotingThresholds.ppSecurityGroup',
  treasuryExpansion: 'treasuryCut',
  'version.major': 'protocolVersion.major',
  'version.minor': 'protocolVersion.minor'
};

/** @internal Decode Hydra's Cardano CLI protocol format with exact numbers. */
export const hydraParameters = (source: unknown): ProtocolParameters => {
  const normalized: Record<string, any> = {};
  for (const [target, original] of Object.entries(fields)) {
    const value = original.split('.').reduce((entry: unknown, key) => object(entry)[key], source);
    const path = target.split('.');
    const leaf = path.pop() ?? invalid();
    const parent = path.reduce((entry, key) => (entry[key] ??= {}), normalized);
    parent[leaf] = value;
  }
  // Hydra currently decodes Conway transactions. These tier constants belong to
  // the Conway ledger and are not exposed in cardano-cli's parameter JSON.
  const major = natural(normalized.version.major);
  if (major < 9 || major > 11) throw new Error('Unsupported Hydra ledger version');
  normalized.minFeeReferenceScripts.range = 25600;
  normalized.minFeeReferenceScripts.multiplier = '6/5';
  normalized.plutusCostModels = Object.fromEntries(
    Object.entries(object(object(source).costModels)).map(([key, value]) => {
      const languages: Record<string, string> = { PlutusV1: 'plutus:v1', PlutusV2: 'plutus:v2', PlutusV3: 'plutus:v3' };
      if (!(key in languages)) return invalid();
      return [languages[key], value];
    })
  );
  return protocolParameters(normalized);
};

/** @internal Decode a Cardano text-envelope reference script. */
const hydraScript = (value: unknown) => {
  const outer = object(value);
  const envelope = object(outer.script);
  const bytes = hex(envelope.cborHex);
  const versions: Record<string, string> = {
    PlutusScriptV1: '01',
    PlutusScriptV2: '02',
    PlutusScriptV3: '03',
    SimpleScript: '00'
  };
  const tag = versions[string(envelope.type)];
  if (tag === undefined) return invalid();
  const language = tag === '00' ? 'SimpleScriptLanguage' : `PlutusScriptLanguage ${string(envelope.type)}`;
  // The actual script language is checked against the text envelope below.
  if (outer.scriptLanguage !== language) return invalid();
  return cborToScript(`82${tag}${bytes}`);
};

/** @internal Flatten policy/name maps while rejecting normalized duplicates. */
const hydraAssets = (amount: Record<string, unknown>): Record<string, bigint> => {
  const assets: Record<string, bigint> = {};
  for (const [policy, tokens] of Object.entries(amount)) {
    if (policy === 'lovelace') continue;
    const id = hex(policy, 28);
    for (const [name, quantity] of Object.entries(object(tokens))) {
      if (name.length > 64) return invalid();
      const token = name === '' ? '' : hex(name);
      if (id + token in assets) return invalid();
      assets[id + token] = integer(quantity, 1n, 9223372036854775807n);
    }
  }
  return assets;
};

/** @internal Distinguish omitted values from present datum metadata. */
const present = (value: unknown): boolean => value !== null && value !== undefined;

/** @internal Decode inline datum bytes and verify optional claimed hashes. */
const hydraDatum = (row: Record<string, unknown>): Partial<UTxO['output']> => {
  if (present(row.inlineDatumRaw)) {
    const bytes = hex(row.inlineDatumRaw);
    if (present(row.inlineDatumhash)) datumBytes(bytes, row.inlineDatumhash);
    if (present(row.datumhash)) return invalid();
    return { datum: cborToPlutusData(bytes) };
  }
  if (present(row.inlineDatum) || present(row.inlineDatumhash)) return invalid();
  return !present(row.datumhash) ? {} : { datumHash: hex(row.datumhash, 32) };
};

/** @internal Decode one confirmed output using the current Cardano JSON dialect. */
const hydraOutput = ([key, raw]: [string, unknown]): UTxO => {
  const parts = key.split('#');
  if (parts.length !== 2) return invalid();
  const row = object(raw);
  const amount = object(row.value);
  return {
    input: input(parts[0], natural(parts[1])),
    output: {
      address: addressText(row.address),
      value: { assets: hydraAssets(amount), coins: integer(amount.lovelace ?? 0, 0n, 9223372036854775807n) },
      ...hydraDatum(row),
      ...(!present(row.referenceScript) ? {} : { scriptReference: hydraScript(row.referenceScript) })
    }
  };
};

/** @internal Decode confirmed snapshot outputs and validate inline datum hashes. */
export const hydraOutputs = (value: unknown): UTxO[] => uniqueOutputs(Object.entries(object(value)).map(hydraOutput));
