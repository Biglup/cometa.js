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

export const readTxIn = (ptr: number): TxIn => {
  if (!ptr) {
    throw new Error('Pointer is null');
  }

  const module = getModule();

  const idPtr = module.transaction_input_get_id(ptr);
  const index = Number(module.transaction_input_get_index(ptr));
  const txId = uint8ArrayToHex(readBlake2bHashData(idPtr));

  unrefObject(idPtr);

  return {
    index,
    txId
  };
};

export const writeTxIn = (txIn: TxIn): number => {
  const module = getModule();
  const txInPtrPtr = module._malloc(4);

  try {
    const indexParts = splitToLowHigh64bit(txIn.index);
    const hashPtr = blake2bHashFromHex(txIn.txId);

    const result = module.transaction_input_new(hashPtr, indexParts.low, indexParts.high, txInPtrPtr);
    assertSuccess(result, 'Failed to create TxIn from values');

    return module.getValue(txInPtrPtr, 'i32');
  } finally {
    module._free(txInPtrPtr);
  }
};
