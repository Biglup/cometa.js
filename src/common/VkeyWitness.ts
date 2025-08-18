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

/* IMPORTS ******************************************************************/

import {
  assertSuccess,
  readTransactionFromCbor,
  unrefObject,
  writeTransactionToCbor,
  writeVkeyWitnessSet
} from '../marshaling';
import { getModule } from '../module';

/* DEFINITIONS **************************************************************/

/**
 * VkeyWitness (Verification Key Witness) is a component of a transaction that
 * provides cryptographic proof that proves that the creator of the transaction
 * has access to the private keys controlling the UTxOs being spent.
 */
export type VkeyWitness = {
  /**
   * The public key associated with this witness.
   */
  vkey: string;

  /**
   * The signature of the transaction input, signed by the corresponding private key.
   */
  signature: string;
};

/**
 * VkeyWitnessSet is a collection of VkeyWitness objects, representing
 * the set of signatures for a transaction.
 */
export type VkeyWitnessSet = VkeyWitness[];

/**
 * Applies verification key (vkey) witnesses to a transaction.
 *
 * This function attaches a set of vkey witnesses to the given transaction.
 *
 * @param transaction The CBOR representing the transaction to which the vkey witnesses will be applied.
 * @param vkeyWitnessSet The VkeyWitnessSet to be applied.
 *
 * @return The CBOR representing the transaction with the applied vkey witnesses.
 */
export const applyVkeyWitnessSet = (transaction: string, vkeyWitnessSet: VkeyWitnessSet): string => {
  const module = getModule();
  let txPtr = 0;
  let witnessSetPtr = 0;

  try {
    txPtr = readTransactionFromCbor(transaction);
    witnessSetPtr = writeVkeyWitnessSet(vkeyWitnessSet);

    assertSuccess(
      module.transaction_apply_vkey_witnesses(txPtr, witnessSetPtr),
      'Failed to apply vkey witnesses to transaction'
    );

    return writeTransactionToCbor(txPtr);
  } finally {
    unrefObject(txPtr);
    unrefObject(witnessSetPtr);
  }
};
