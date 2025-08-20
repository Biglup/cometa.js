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

import { CborReader } from '../encoding';
import { UTxO } from '../common';
import { getModule } from '../module';
import { readTxIn, writeTxIn } from './txIn';
import { readTxOut, writeTxOut } from './txOut';
import { unrefObject } from './object';

/* DEFINITIONS ****************************************************************/

/**
 * @hidden
 * Reads a pointer to a C `cardano_utxo_t` object and converts it into a
 * JavaScript UTxO object.
 *
 * @param {number} ptr A pointer to the C `cardano_utxo_t` object.
 * @returns {UTxO} The JavaScript representation of the UTxO.
 */
export const readUtxo = (ptr: number): UTxO => {
  if (!ptr) {
    throw new Error('Pointer to UTxO is null');
  }

  const module = getModule();
  let inputPtr = 0;
  let outputPtr = 0;

  try {
    inputPtr = module.utxo_get_input(ptr);
    outputPtr = module.utxo_get_output(ptr);

    const input = readTxIn(inputPtr);
    const output = readTxOut(outputPtr);

    return {
      input,
      output
    };
  } finally {
    if (inputPtr !== 0) {
      unrefObject(inputPtr);
    }
    if (outputPtr !== 0) {
      unrefObject(outputPtr);
    }
  }
};

/**
 * @hidden
 * Converts a JavaScript UTxO object into a C `cardano_utxo_t` object in
 * WASM memory and returns a pointer to it.
 *
 * @param {UTxO} utxo The JavaScript UTxO object.
 * @returns {number} A pointer to the C object. The caller is responsible for freeing this object.
 */
export const writeUtxo = (utxo: UTxO): number => {
  const module = getModule();
  let inputPtr = 0;
  let outputPtr = 0;
  let utxoPtr = 0;
  let utxoPtrPtr = 0; // For the C "out" parameter

  try {
    inputPtr = writeTxIn(utxo.input);
    outputPtr = writeTxOut(utxo.output);

    utxoPtrPtr = module._malloc(4);
    const result = module.utxo_new(inputPtr, outputPtr, utxoPtrPtr);

    if (result !== 0) {
      throw new Error(`Failed to create UTxO, error code: ${result}`);
    }

    utxoPtr = module.getValue(utxoPtrPtr, 'i32');
    module._free(utxoPtrPtr);
    utxoPtrPtr = 0;

    return utxoPtr;
  } catch (error) {
    if (utxoPtr !== 0) {
      unrefObject(utxoPtr);
    }
    throw error;
  } finally {
    if (inputPtr !== 0) {
      unrefObject(inputPtr);
    }
    if (outputPtr !== 0) {
      unrefObject(outputPtr);
    }
    if (utxoPtrPtr !== 0) {
      module._free(utxoPtrPtr);
    }
  }
};

/**
 * @hidden
 * Converts a JavaScript array of UTxO objects into a C `cardano_utxo_list_t`
 * object in WASM memory and returns a pointer to it.
 *
 * @param {UTxO[]} utxos The JavaScript array of UTxO objects.
 * @returns {number} A pointer to the C `cardano_utxo_list_t`. The caller is responsible for freeing this object.
 */
export const writeUtxoList = (utxos: UTxO[]): number => {
  const module = getModule();
  let listPtr = 0;
  let listPtrPtr = 0;

  try {
    listPtrPtr = module._malloc(4);
    const result = module.utxo_list_new(listPtrPtr);
    if (result !== 0) {
      throw new Error(`Failed to create UTxO list, error code: ${result}`);
    }
    listPtr = module.getValue(listPtrPtr, 'i32');
    module._free(listPtrPtr);
    listPtrPtr = 0;

    for (const utxo of utxos) {
      let utxoPtr = 0;
      try {
        utxoPtr = writeUtxo(utxo);
        module.utxo_list_add(listPtr, utxoPtr);
      } finally {
        if (utxoPtr !== 0) {
          unrefObject(utxoPtr);
        }
      }
    }

    return listPtr;
  } catch (error) {
    if (listPtr !== 0) {
      unrefObject(listPtr);
    }
    throw error;
  } finally {
    if (listPtrPtr !== 0) {
      module._free(listPtrPtr);
    }
  }
};

/**
 * @hidden
 * Reads a pointer to a C `cardano_utxo_list_t` object and converts it into a
 * JavaScript array of UTxO objects.
 *
 * @param {number} ptr A pointer to the C `cardano_utxo_list_t` object.
 * @returns {UTxO[]} The JavaScript representation of the UTxO list.
 */
export const readUtxoList = (ptr: number): UTxO[] => {
  if (ptr === 0) {
    return [];
  }

  const module = getModule();
  const jsArray: UTxO[] = [];
  const len = module.utxo_list_get_length(ptr);

  for (let i = 0; i < len; i++) {
    let utxoPtr = 0;
    let utxoPtrPtr = 0;

    try {
      utxoPtrPtr = module._malloc(4);
      const result = module.utxo_list_get(ptr, i, utxoPtrPtr);
      if (result !== 0) {
        throw new Error(`Failed to get UTxO at index ${i}, error code: ${result}`);
      }
      utxoPtr = module.getValue(utxoPtrPtr, 'i32');
      module._free(utxoPtrPtr);
      utxoPtrPtr = 0;

      jsArray.push(readUtxo(utxoPtr));
    } finally {
      if (utxoPtr !== 0) {
        unrefObject(utxoPtr);
      }
      if (utxoPtrPtr !== 0) {
        module._free(utxoPtrPtr);
      }
    }
  }

  return jsArray;
};

/**
 * @hidden
 * Deserializes a UTxO from its CBOR hex string representation into a UTxO object.
 *
 * @param {string} utxoCbor - The CBOR representation of the UTxO, encoded as a hexadecimal string.
 * @returns {number} A pointer to the newly created value object in WASM memory.
 * @throws {Error} Throws an error if the deserialization fails, including a descriptive message from the CBOR parser.
 */
export const readUTxOtFromCbor = (utxoCbor: string): UTxO => {
  const module = getModule();

  const cborReader = CborReader.fromHex(utxoCbor);
  const valuePtrPtr = module._malloc(4);
  let valuePtr = 0;

  try {
    const result = module.utxo_from_cbor(cborReader.ptr, valuePtrPtr);

    if (result !== 0) {
      const error = cborReader.getLastError();
      throw new Error(`Failed to unmarshal transaction from CBOR: ${error}`);
    }

    valuePtr = module.getValue(valuePtrPtr, 'i32');
    return readUtxo(valuePtr);
  } finally {
    unrefObject(valuePtr);
    module._free(valuePtrPtr);
  }
};
