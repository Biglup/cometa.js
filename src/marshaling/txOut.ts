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

/* DEFINITIONS ****************************************************************/

const DATUM_TYPE_DATA_HASH = 0;
const DATUM_TYPE_INLINE_DATA = 1;

/**
 * @private
 * Reads a C datum pointer and returns its JS representation.
 * Manages its own memory.
 * @param {number} datumPtr - Pointer to a cardano_datum_t object.
 * @returns {{inlineDatum?: PlutusData, datumHash?: string}}
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
 * @private
 * Writes a JS datum or datumHash to C and returns a cardano_datum_t pointer.
 * @param {{datum?: PlutusData, datumHash?: string}} txOut
 * @returns {number} A pointer to a cardano_datum_t object, or 0 if no datum is present.
 */
/**
 * @private
 * Writes a JS datum or datumHash to C and returns a cardano_datum_t pointer.
 * This function correctly handles the C API's out-parameter pattern.
 *
 * @param {TxOut} txOut The transaction output containing the datum info.
 * @returns {number} A pointer to a C `cardano_datum_t` object, or 0 if no datum is present.
 */
const _writeDatum = (txOut: TxOut): number => {
  if (!txOut.datum && !txOut.datumHash) {
    return 0; // No datum to write.
  }

  const module = getModule();
  let dataPtr = 0;
  let hashPtr = 0;
  let datumPtr = 0;
  let datumPtrPtr = 0; // For the out-parameter

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

    // Transfer ownership to the caller
    const finalPtr = datumPtr;
    datumPtr = 0;
    return finalPtr;
  } catch (error) {
    if (datumPtr !== 0) unrefObject(datumPtr);
    throw error;
  } finally {
    // The new datum object now owns dataPtr/hashPtr. We only release our local reference.
    if (dataPtr !== 0) unrefObject(dataPtr);
    if (hashPtr !== 0) unrefObject(hashPtr);
    // Always free the temporary out-parameter buffer.
    if (datumPtrPtr !== 0) module._free(datumPtrPtr);
  }
};

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
 * Converts a JavaScript TxOut object into a C cardano_transaction_output_t
 * object in WASM memory and returns a pointer to it.
 *
 * @param {TxOut} txOut The JavaScript transaction output object.
 * @returns {number} A pointer to the C object. The caller is responsible for freeing this object.
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
