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

import { Address, RewardAddress } from '../address';
import { InstanceType, getFromInstanceRegistry, reportBridgeError } from '../instanceRegistry';
import { ProtocolParameters, UTxO, cborToPlutusData } from '../common';
import { blake2bHashFromHex, readBlake2bHashData } from './blake2b';
import { readAssetId } from './assetId';
import { readInputSet } from './txIn';
import { readUtxoList, writeUtxo, writeUtxoList } from './utxo';
import { readValue } from './value';
import { uint8ArrayToHex } from '../cometa';
import { writePlutusData } from './plutusData';
import { writeProtocolParameters } from './protocolParameters';
import { writeRedeemerList } from './redeemer';
import { writeTransactionToCbor } from './transaction';

/* DEFINITIONS ****************************************************************/

/**
 * Bridge callbacks for marshaling various Cardano data types.
 *
 * These functions are used to convert between JavaScript representations
 * and their corresponding WASM memory representations.
 */
export const bridgeCallbacks = {
  get_provider_from_registry(objectId: number) {
    return getFromInstanceRegistry(InstanceType.Provider, objectId);
  },
  get_coin_selector_from_registry(objectId: number) {
    return getFromInstanceRegistry(InstanceType.CoinSelector, objectId);
  },
  get_tx_evaluator_from_registry(objectId: number) {
    return getFromInstanceRegistry(InstanceType.TxEvaluator, objectId);
  },
  report_provider_bridge_error(objectId: number, exception: any) {
    return reportBridgeError(InstanceType.Provider, objectId, exception);
  },
  report_coin_selector_bridge_error(objectId: number, exception: any) {
    return reportBridgeError(InstanceType.CoinSelector, objectId, exception);
  },
  report_tx_evaluator_bridge_error(objectId: number, exception: any) {
    return reportBridgeError(InstanceType.TxEvaluator, objectId, exception);
  },
  marshal_blake2b_hash_from_hex(jsHexString: string) {
    return blake2bHashFromHex(jsHexString);
  },
  marshal_plutus_data(jsPlutusDataCborHex: string) {
    const plutusData = cborToPlutusData(jsPlutusDataCborHex);
    return writePlutusData(plutusData);
  },
  marshal_protocol_parameters(params: ProtocolParameters) {
    return writeProtocolParameters(params);
  },
  marshal_redeemer_list(jsRedeemerArray: any[]) {
    return writeRedeemerList(jsRedeemerArray);
  },
  marshal_utxo(jsUtxoObj: UTxO) {
    return writeUtxo(jsUtxoObj);
  },
  marshal_utxo_list(jsUtxoArray: UTxO[]) {
    return writeUtxoList(jsUtxoArray);
  },
  marshall_address(addressPtr: number) {
    const addr = new Address(addressPtr, false);
    return addr.toString();
  },
  marshall_asset_id(assetIdPtr: number) {
    return readAssetId(assetIdPtr);
  },
  marshall_blake2b_hash(hashPtr: number) {
    return uint8ArrayToHex(readBlake2bHashData(hashPtr, false));
  },
  marshall_reward_address(rewardAddressPtr: number) {
    const addr = new RewardAddress(rewardAddressPtr, false);
    return addr.toAddress().toString();
  },
  marshall_transaction_to_cbor_hex(txPtr: number) {
    return writeTransactionToCbor(txPtr);
  },
  marshall_tx_input_set(inputSetPtr: number) {
    return readInputSet(inputSetPtr);
  },
  marshall_utxo_list_to_js(utxoListPtr: number) {
    return readUtxoList(utxoListPtr);
  },
  marshall_value_to_js(valuePtr: number) {
    return readValue(valuePtr);
  }
};
