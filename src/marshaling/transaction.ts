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

import { CborReader, CborWriter } from '../encoding';
import { UTxO } from '../common';
import { assertSuccess, unrefObject } from './object';
import { getModule } from '../module';
import { readBlake2bHashData } from './blake2b';
import { uint8ArrayToHex } from '../cometa';
import { writeUtxoList } from './utxo';

/* DEFINITIONS ****************************************************************/

/**
 * @hidden
 * Serializes a native transaction object into its CBOR representation as a hex string.
 *
 * @param {number} transactionPtr - A pointer to the transaction object in WASM memory.
 * @returns {string} The CBOR representation of the transaction, encoded as a hexadecimal string.
 * @throws {Error} Throws an error if the input pointer is null or if the serialization fails.
 */
export const writeTransactionToCbor = (transactionPtr: number): string => {
  const module = getModule();

  if (!transactionPtr) {
    throw new Error('Failed to get transaction. Pointer is null.');
  }

  const cborWriter = new CborWriter();

  const result = module.transaction_to_cbor(transactionPtr, cborWriter.ptr);

  if (result !== 0) {
    const errorCString = module.transaction_get_last_error(cborWriter.ptr);
    const codeCString = module.error_to_string(result);

    const errorMessage = module.UTF8ToString(errorCString);
    const codeMessage = module.UTF8ToString(codeCString);
    throw new Error(`Failed to marshal transaction to CBOR: ${codeMessage} - ${errorMessage}`);
  }

  return cborWriter.encodeHex();
};

/**
 * @hidden
 * Deserializes a transaction from its CBOR hex string representation into a native object in WASM memory.
 *
 * @param {string} transactionCbor - The CBOR representation of the transaction, encoded as a hexadecimal string.
 * @returns {number} A pointer to the newly created transaction object in WASM memory. The caller is responsible for freeing this object.
 * @throws {Error} Throws an error if the deserialization fails, including a descriptive message from the CBOR parser.
 */
export const readTransactionFromCbor = (transactionCbor: string): number => {
  const module = getModule();

  const cborReader = CborReader.fromHex(transactionCbor);
  const txPtrPtr = module._malloc(4);

  try {
    const result = module.transaction_from_cbor(cborReader.ptr, txPtrPtr);

    if (result !== 0) {
      const error = cborReader.getLastError();
      throw new Error(`Failed to unmarshal transaction from CBOR: ${error}`);
    }

    return module.getValue(txPtrPtr, 'i32');
  } finally {
    module._free(txPtrPtr);
  }
};

/**
 * @hidden
 * Extracts the unique set of public key hashes (signers) required to authorize a Cardano transaction.
 *
 * This function computes the required signers by analyzing the transaction body and a list of
 * resolved input UTxOs.
 *
 * @param {string} transactionCbor - The CBOR representation of the transaction as a hex string.
 * @param {UTxO[]} utxos - An array of resolved UTxO objects that are spent by the transaction. If
 * empty, the function won't resolve signers from inputs or collateral inputs. Additionally if the resolved
 * inputs are provided, they must account for all inputs and collateral inputs in the transaction or the function will fail.
 * @returns {string[]} An array of unique public key hashes (signers) as hex strings.
 * @throws {Error} Throws an error if any part of the process fails.
 */
// eslint-disable-next-line max-statements
export const getUniqueSigners = (transactionCbor: string, utxos: UTxO[]): string[] => {
  const module = getModule();

  let txPtr = 0;
  let resolvedInputsListPtr = 0;
  let signersSetPtr = 0;
  const txPtrPtr = module._malloc(4);
  const signersSetPtrPtr = module._malloc(4);

  try {
    const cborReader = CborReader.fromHex(transactionCbor);
    let result = module.transaction_from_cbor(cborReader.ptr, txPtrPtr);
    assertSuccess(result, `Failed to unmarshal transaction: ${cborReader.getLastError()}`);
    txPtr = module.getValue(txPtrPtr, 'i32');

    if (utxos.length > 0) {
      resolvedInputsListPtr = writeUtxoList(utxos);
    }

    result = module.transaction_get_unique_signers(txPtr, resolvedInputsListPtr, signersSetPtrPtr);
    assertSuccess(result, 'Failed to get unique signers from transaction');

    signersSetPtr = module.getValue(signersSetPtrPtr, 'i32');

    const signersCount = module.blake2b_hash_set_get_length(signersSetPtr);
    const signers: string[] = [];

    for (let i = 0; i < signersCount; i++) {
      const elementPtrPtr = module._malloc(4);
      let hashPtr = 0;

      try {
        const getResult = module.blake2b_hash_set_get(signersSetPtr, i, elementPtrPtr);
        assertSuccess(getResult, `Failed to get signer hash at index ${i}`);

        hashPtr = module.getValue(elementPtrPtr, 'i32');

        const hashHex = uint8ArrayToHex(readBlake2bHashData(hashPtr, false));
        signers.push(hashHex);
      } finally {
        unrefObject(hashPtr);
        module._free(elementPtrPtr);
      }
    }

    return signers;
  } finally {
    unrefObject(txPtr);
    unrefObject(resolvedInputsListPtr);
    unrefObject(signersSetPtr);
    module._free(txPtrPtr);
    module._free(signersSetPtrPtr);
  }
};
