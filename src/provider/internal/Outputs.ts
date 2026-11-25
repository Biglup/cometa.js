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

import { Address } from '../../address';
import { Blake2b } from '../../crypto';
import {
  PlutusLanguageVersion,
  Script,
  ScriptType,
  UTxO,
  cborToPlutusData,
  cborToScript,
  computeScriptHash,
  jsonToNativeScript,
  plutusDataToCbor,
  scriptToCbor
} from '../../common';
import { array, hex, input, integer, invalid, natural, object, string } from './Values';
import { hexToUint8Array, uint8ArrayToHex } from '../../cometa';

/* DEFINITIONS ****************************************************************/

const assetNamePattern = /^(?:[a-fA-F0-9]{2}){0,32}$/;
const assetIdPattern = /^[0-9a-f]{56}(?:[0-9a-f]{2}){0,32}$/;

/** @internal Validate a payment address through the binding's ledger decoder. */
export const addressText = (value: unknown): string => Address.fromString(string(value)).toString();

/** @internal Verify datum bytes before exposing them to a caller. */
export const datumBytes = (value: unknown, expected: unknown): string => {
  const bytes = hex(value);
  cborToPlutusData(bytes);
  if (uint8ArrayToHex(Blake2b.computeHash(hexToUint8Array(bytes), 32)) !== hex(expected, 32)) return invalid();
  return bytes;
};

/** @internal Decode raw reference scripts and verify their claimed hash. */
export const referenceScript = (language: unknown, bytes: unknown, expected: unknown): Script => {
  const kind = string(language);
  const encoded = hex(bytes);
  let script: Script;
  if (kind === 'native' || kind === 'timelock') {
    script = cborToScript(`8200${encoded}`);
  } else {
    const versions: Record<string, PlutusLanguageVersion> = {
      'plutus:v1': PlutusLanguageVersion.V1,
      'plutus:v2': PlutusLanguageVersion.V2,
      'plutus:v3': PlutusLanguageVersion.V3,
      'plutus:v4': PlutusLanguageVersion.V4,
      plutusV1: PlutusLanguageVersion.V1,
      plutusV2: PlutusLanguageVersion.V2,
      plutusV3: PlutusLanguageVersion.V3,
      plutusV4: PlutusLanguageVersion.V4
    };
    if (!(kind in versions)) throw new Error('Unsupported reference-script language');
    script = { bytes: encoded, type: ScriptType.Plutus, version: versions[kind] };
  }
  if (computeScriptHash(script) !== hex(expected, 28)) return invalid();
  return script;
};

/** @internal Validate native-script JSON before the permissive public converter. */
const nativeJson = (value: unknown, depth = 0): unknown => {
  if (depth > 64) return invalid();
  const row = object(value);
  switch (row.type) {
    case 'sig':
      return { keyHash: hex(row.keyHash, 28), type: 'sig' };
    case 'before':
    case 'after':
      return { slot: natural(row.slot), type: row.type };
    case 'all':
    case 'any':
      return { scripts: array(row.scripts).map((child) => nativeJson(child, depth + 1)), type: row.type };
    case 'atLeast':
      return {
        required: natural(row.required),
        scripts: array(row.scripts).map((child) => nativeJson(child, depth + 1)),
        type: row.type
      };
    default:
      return invalid();
  }
};

/** @internal Decode native asset quantities and reject duplicate identifiers. */
const koiosAssets = (entries: unknown): Record<string, bigint> => {
  const assets: Record<string, bigint> = {};
  for (const value of array(entries ?? [])) {
    const asset = object(value);
    const policy = hex(asset.policy_id, 28);
    const name = string(asset.asset_name);
    if (!assetNamePattern.test(name)) return invalid();
    const unit = policy + name.toLowerCase();
    if (unit in assets) return invalid();
    assets[unit] = integer(asset.quantity, 1n, 9223372036854775807n);
  }
  return assets;
};

/** @internal Koios supplies native scripts as JSON when bytecode is unavailable. */
const koiosScript = (value: unknown): Script => {
  const script = object(value);
  if (script.type === 'timelock' && script.bytes === null) {
    const native = jsonToNativeScript(nativeJson(script.value));
    if (computeScriptHash(native) !== hex(script.hash, 28)) return invalid();
    return native;
  }
  return referenceScript(script.type, script.bytes, script.hash);
};

/** @internal Decode Koios extended UTxO responses, retaining integer quantities. */
export const koiosOutput = (value: unknown): UTxO => {
  const row = object(value);
  if (typeof row.is_spent !== 'boolean') return invalid();
  const output: UTxO = {
    input: input(row.tx_hash, row.tx_index),
    output: {
      address: addressText(row.address),
      value: { assets: koiosAssets(row.asset_list), coins: integer(row.value, 0n, 9223372036854775807n) }
    }
  };
  if (row.inline_datum !== null && row.inline_datum !== undefined) {
    output.output.datum = cborToPlutusData(datumBytes(object(row.inline_datum).bytes, row.datum_hash));
  } else if (row.datum_hash !== null && row.datum_hash !== undefined) output.output.datumHash = hex(row.datum_hash, 32);
  if (row.reference_script !== null && row.reference_script !== undefined) {
    output.output.scriptReference = koiosScript(row.reference_script);
  }
  return output;
};

/** @internal Serialize additional UTxOs using the Ogmios v6 flat-object dialect. */
export const ogmiosOutput = (utxo: UTxO): unknown => {
  const reference = input(utxo.input.txId, utxo.input.index);
  const value: Record<string, Record<string, bigint>> = {
    ada: { lovelace: integer(utxo.output.value.coins, 0n, 9223372036854775807n) }
  };
  for (const [unit, quantity] of Object.entries(utxo.output.value.assets ?? {})) {
    if (!assetIdPattern.test(unit)) throw new Error('Invalid asset identifier');
    const policy = unit.slice(0, 56);
    value[policy] ??= {};
    value[policy][unit.slice(56)] = integer(quantity, 1n, 9223372036854775807n);
  }
  const script = utxo.output.scriptReference;
  const encodedScript = !script
    ? undefined
    : script.type === ScriptType.Plutus
    ? { cbor: hex(script.bytes), language: `plutus:v${script.version + 1}` }
    : { cbor: scriptToCbor(script).slice(4), language: 'native' };
  return {
    address: addressText(utxo.output.address),
    datum: utxo.output.datum === undefined ? undefined : plutusDataToCbor(utxo.output.datum),
    datumHash: utxo.output.datumHash === undefined ? undefined : hex(utxo.output.datumHash, 32),
    index: reference.index,
    script: encodedScript,
    transaction: { id: reference.txId },
    value
  };
};
