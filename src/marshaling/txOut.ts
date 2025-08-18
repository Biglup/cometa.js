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

import { Address } from '../address';
import { PlutusData, TxOut } from '../common';
import { assertSuccess, unrefObject } from './object';
import { blake2bHashFromHex, readBlake2bHashData } from './blake2b';
import { getModule } from '../module';
import { readPlutusData, writePlutusData } from './plutusData';
import { readScript, writeScript } from './script';
import { readValue, writeValue } from './value';
import { uint8ArrayToHex } from '../cometa';

/* CONSTANTS ******************************************************************/

const DATUM_TYPE_DATA_HASH = 0;
const DATUM_TYPE_INLINE_DATA = 1;

/* DEFINITIONS ****************************************************************/

/**
 * @hidden
 * Internal helper to read a Datum from its WASM pointer.
 * It determines if the datum is inline or a hash and returns the appropriate JS representation.
 *
 * @param {number} datumPtr - Pointer to the native Datum object. Returns an empty object if the pointer is null.
 * @returns {{ inlineDatum?: PlutusData; datumHash?: string }} An object containing either the inlineDatum or datumHash.
 */
const _readDatum = (datumPtr: number): { inlineDatum?: PlutusData; datumHash?: string } => {
  if (datumPtr === 0) {
    return {};
  }

  const module = getModule();
  let typePtr = 0;
  let hashPtr = 0;
  let dataPtr = 0;

  try {
    typePtr = module._malloc(4);
    module.datum_get_type(datumPtr, typePtr);
    const datumType = module.getValue(typePtr, 'i32');

    if (datumType === DATUM_TYPE_DATA_HASH) {
      hashPtr = module.datum_get_data_hash(datumPtr);
      const datumHash = uint8ArrayToHex(readBlake2bHashData(hashPtr));
      return { datumHash };
    } else if (datumType === DATUM_TYPE_INLINE_DATA) {
      dataPtr = module.datum_get_inline_data(datumPtr);
      const inlineDatum = readPlutusData(dataPtr);
      return { inlineDatum };
    }
    return {};
  } finally {
    if (typePtr !== 0) module._free(typePtr);
    if (dataPtr !== 0) unrefObject(dataPtr);
  }
};

/**
 * @hidden
 * Internal helper to create a native Datum object from a TxOut's datum properties.
 *
 * @param {TxOut} txOut - The JavaScript TxOut object containing datum information.
 * @returns {number} A pointer to the created native Datum object, or 0 if no datum was present.
 * @throws {Error} Throws if the creation of the native datum object fails.
 */
const _writeDatum = (txOut: TxOut): number => {
  if (!txOut.datum && !txOut.datumHash) {
    return 0;
  }

  const module = getModule();
  let dataPtr = 0;
  let hashPtr = 0;
  let datumPtr = 0;
  let datumPtrPtr = 0;

  try {
    datumPtrPtr = module._malloc(4);

    if (txOut.datum) {
      dataPtr = writePlutusData(txOut.datum);
      const result = module.datum_new_inline_data(dataPtr, datumPtrPtr);
      assertSuccess(result, 'Failed to create inline datum');
    } else if (txOut.datumHash) {
      hashPtr = blake2bHashFromHex(txOut.datumHash);
      const result = module.datum_new_data_hash(hashPtr, datumPtrPtr);
      assertSuccess(result, 'Failed to create datum hash');
    }

    datumPtr = module.getValue(datumPtrPtr, 'i32');

    const finalPtr = datumPtr;
    datumPtr = 0;
    return finalPtr;
  } catch (error) {
    if (datumPtr !== 0) unrefObject(datumPtr);
    throw error;
  } finally {
    if (dataPtr !== 0) unrefObject(dataPtr);
    if (hashPtr !== 0) unrefObject(hashPtr);
    if (datumPtrPtr !== 0) module._free(datumPtrPtr);
  }
};

/**
 * @hidden
 * Reads a transaction output from a WASM memory pointer and converts it into a JavaScript object.
 *
 * @param {number} ptr - A pointer to the `cardano_transaction_output_t` object in WASM memory.
 * @returns {TxOut} The JavaScript representation of the transaction output.
 * @throws {Error} Throws an error if the input pointer is null.
 */
export const readTxOut = (ptr: number): TxOut => {
  if (!ptr) {
    throw new Error('Pointer is null');
  }

  const module = getModule();
  let addressPtr = 0;
  let valuePtr = 0;
  let scriptRefPtr = 0;
  let datumPtr = 0;

  try {
    addressPtr = module.transaction_output_get_address(ptr);
    valuePtr = module.transaction_output_get_value(ptr);
    scriptRefPtr = module.transaction_output_get_script_ref(ptr);
    datumPtr = module.transaction_output_get_datum(ptr);

    const address = new Address(addressPtr, false);
    const value = readValue(valuePtr);
    const { inlineDatum, datumHash } = _readDatum(datumPtr);

    let script;
    if (scriptRefPtr !== 0) {
      script = readScript(scriptRefPtr);
    }

    return {
      address: address.toString(),
      datum: inlineDatum,
      datumHash,
      scriptReference: script,
      value
    };
  } finally {
    if (addressPtr !== 0) unrefObject(addressPtr);
    if (valuePtr !== 0) unrefObject(valuePtr);
    if (scriptRefPtr !== 0) unrefObject(scriptRefPtr);
    if (datumPtr !== 0) unrefObject(datumPtr);
  }
};

/**
 * @hidden
 * Creates a transaction output object in WASM memory from a JavaScript object.
 *
 * This function handles the serialization of the address, value, datum, and script reference
 * into a single native transaction output object.
 *
 * @param {TxOut} txOut - The JavaScript object representing the transaction output.
 * @param {string} txOut.address - The bech32 or base58 encoded destination address.
 * @param {Value} txOut.value - The value (coins and multi-assets) contained in the output.
 * @param {PlutusData} [txOut.datum] - Optional inline datum attached to the output.
 * @param {string} [txOut.datumHash] - Optional datum hash attached to the output.
 * @param {Script} [txOut.scriptReference] - Optional script reference attached to the output.
 * @returns {number} A pointer to the created `cardano_transaction_output_t` object. The caller is responsible for freeing this object.
 * @throws {Error} Throws an error if any part of the creation fails (e.g., invalid address format).
 */
// eslint-disable-next-line complexity,max-statements
export const writeTxOut = (txOut: TxOut): number => {
  const module = getModule();
  let address: Address | null = null;
  let valuePtr = 0;
  let datumPtr = 0;
  let scriptRefPtr = 0;
  let txOutPtr = 0;
  let txOutPtrPtr = 0;

  try {
    address = Address.fromString(txOut.address);
    valuePtr = writeValue(txOut.value);
    datumPtr = _writeDatum(txOut);

    if (txOut.scriptReference) {
      scriptRefPtr = writeScript(txOut.scriptReference);
    }

    txOutPtrPtr = module._malloc(4);
    const result = module.transaction_output_new(address.ptr, 0, 0, txOutPtrPtr);
    if (result !== 0) {
      throw new Error(`Failed to create transaction output, error code: ${result}`);
    }
    txOutPtr = module.getValue(txOutPtrPtr, 'i32');
    module._free(txOutPtrPtr);
    txOutPtrPtr = 0;
    module.transaction_output_set_value(txOutPtr, valuePtr);
    if (datumPtr !== 0) {
      module.transaction_output_set_datum(txOutPtr, datumPtr);
    }
    if (scriptRefPtr !== 0) {
      module.transaction_output_set_script_ref(txOutPtr, scriptRefPtr);
    }
    const finalPtr = txOutPtr;
    txOutPtr = 0;
    return finalPtr;
  } catch (error) {
    if (txOutPtr !== 0) {
      unrefObject(txOutPtr);
    }
    throw error;
  } finally {
    if (valuePtr !== 0) unrefObject(valuePtr);
    if (datumPtr !== 0) unrefObject(datumPtr);
    if (scriptRefPtr !== 0) unrefObject(scriptRefPtr);
    if (txOutPtrPtr !== 0) module._free(txOutPtrPtr);
  }
};
