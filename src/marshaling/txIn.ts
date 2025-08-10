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

import { TxIn } from '../common';
import { assertSuccess, unrefObject } from './object';
import { blake2bHashFromHex, readBlake2bHashData } from './blake2b';
import { getModule } from '../module';
import { splitToLowHigh64bit } from './number';
import { uint8ArrayToHex } from '../cometa';

/* DEFINITIONS ****************************************************************/

/**
 * Reads a pointer to a C `cardano_transaction_input_t` and converts it to a JS object.
 * This function is now memory-safe.
 */
export const readTxIn = (ptr: number): TxIn => {
  if (!ptr) {
    throw new Error('Pointer is null');
  }

  const module = getModule();
  let idPtr = 0; // Will hold the pointer to the hash object

  try {
    // `transaction_input_get_id` returns a new reference that we must clean up.
    idPtr = module.transaction_input_get_id(ptr);
    if (idPtr === 0) {
      throw new Error('Failed to get transaction ID from input.');
    }

    const index = Number(module.transaction_input_get_index(ptr));
    const txId = uint8ArrayToHex(readBlake2bHashData(idPtr, false));

    return {
      index,
      txId,
    };
  } finally {
    // FIX: Always release the reference to the hash object before exiting.
    if (idPtr !== 0) {
      unrefObject(idPtr);
    }
  }
};

export const writeTxIn = (txIn: TxIn): number => {
  const module = getModule();
  const txInPtrPtr = module._malloc(4);
  let hashPtr = 0;
  let txInPtr = 0;

  try {
    hashPtr = blake2bHashFromHex(txIn.txId);

    const indexParts = splitToLowHigh64bit(BigInt(txIn.index));
    const result = module.transaction_input_new(hashPtr, indexParts.low, indexParts.high, txInPtrPtr);
    assertSuccess(result, 'Failed to create TxIn from values');

    txInPtr = module.getValue(txInPtrPtr, 'i32');

    const finalPtr = txInPtr;
    txInPtr = 0;
    return finalPtr;
  } catch (error) {
    if (txInPtr !== 0) unrefObject(txInPtr);
    throw error;
  } finally {
    if (hashPtr !== 0) {
      unrefObject(hashPtr);
    }
    module._free(txInPtrPtr);
  }
};

export const readInputSet = (inputSetPtr: number): TxIn[] => {
  if (!inputSetPtr) {
    return [];
  }
  const module = getModule();
  const len = module.transaction_input_set_get_length(inputSetPtr);
  const jsArray: TxIn[] = [];

  for (let i = 0; i < len; i++) {
    let inputPtr = 0;
    const inputPtrPtr = module._malloc(4); // Allocate for the out-parameter

    try {
      const result = module.transaction_input_set_get(inputSetPtr, i, inputPtrPtr);
      assertSuccess(result, `Failed to get input at index ${i}`);
      // Get the actual pointer to the input element.
      inputPtr = module.getValue(inputPtrPtr, 'i32');
      // Now we can safely read from the valid inputPtr.
      const idPtr = module.transaction_input_get_id(inputPtr);
      try {
        const index = Number(module.transaction_input_get_index(inputPtr));
        const txId = uint8ArrayToHex(readBlake2bHashData(idPtr, false));
        jsArray.push({ index, txId });
      } finally {
        // Clean up the new reference to the hash.
        if (idPtr) unrefObject(idPtr);
      }
    } finally {
      // Clean up the new reference to the input element and the temporary pointer.
      if (inputPtr !== 0) {
        unrefObject(inputPtr);
      }
      module._free(inputPtrPtr);
    }
  }
  return jsArray;
};

/**
 * Converts a JavaScript array of TxIn objects into a C `cardano_transaction_input_set_t`
 * and returns its pointer.
 *
 * @param {TxIn[]} txIns The JavaScript array of transaction inputs.
 * @returns {number} A pointer to the C `cardano_transaction_input_set_t`.
 */
/**
 * Converts a JavaScript array of TxIn objects into a C `cardano_transaction_input_set_t`
 * and returns its pointer.
 *
 * @param {TxIn[]} txIns The JavaScript array of transaction inputs.
 * @returns {number} A pointer to the C `cardano_transaction_input_set_t`.
 */
export const writeInputSet = (txIns: TxIn[]): number => {
  const module = getModule();
  let inputSetPtr = 0;
  let inputSetPtrPtr = 0;

  try {
    inputSetPtrPtr = module._malloc(4);
    const result = module.transaction_input_set_new(inputSetPtrPtr);
    if (result !== 0) {
      throw new Error(`Failed to create transaction input set, error: ${result}`);
    }
    inputSetPtr = module.getValue(inputSetPtrPtr, 'i32');
    module._free(inputSetPtrPtr);
    inputSetPtrPtr = 0;

    for (const txIn of txIns) {
      let inputPtr = 0;
      try {
        console.error('sssssssssssssss')
        inputPtr = writeTxIn(txIn); // Now calls the fixed version
        console.error('bbbbbbbbbbbbbbbbb')
        module.transaction_input_set_add(inputSetPtr, inputPtr);
      } finally {
        if (inputPtr !== 0) {
          unrefObject(inputPtr);
        }
      }
    }

    const finalPtr = inputSetPtr;
    inputSetPtr = 0;
    return finalPtr;
  } catch (error) {
    if (inputSetPtr !== 0) unrefObject(inputSetPtr);
    throw error;
  } finally {
    if (inputSetPtrPtr !== 0) module._free(inputSetPtrPtr);
  }
};
