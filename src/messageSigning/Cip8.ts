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

import { Address } from '../address';
import { Ed25519PrivateKey } from '../crypto';
import { assertSuccess, blake2bHashFromBytes, readBufferData, unrefObject } from '../marshaling';
import { getModule } from '../module';

/* DEFINITIONS ****************************************************************/

/**
 * The result of a CIP-8 signing operation, containing the COSE_Sign1 and COSE_Key
 * CBOR-encoded buffers.
 *
 * @typedef {Object} Cip8SignResult
 * @property {Uint8Array} coseSign1 - The CBOR-encoded COSE_Sign1 structure.
 * @property {Uint8Array} coseKey - The CBOR-encoded COSE_Key structure.
 */
export type Cip8SignResult = {
  coseSign1: Uint8Array;
  coseKey: Uint8Array;
};

/**
 * A utility class for creating CIP-8 / COSE signatures using Cardano types.
 *
 * These functions produce the necessary COSE_Sign1 and COSE_Key structures
 * required by the CIP-30 `signData` API.
 */
export class Cip8 {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  /**
   * Signs arbitrary data and binds the signature to a Cardano address.
   *
   * @param {Uint8Array} message - The raw message bytes to sign.
   * @param {Address} address - The Cardano address object.
   * @param {Ed25519PrivateKey} signingKey - The Ed25519 private key object.
   * @returns {Cip8SignResult} - An object containing the COSE_Sign1 and COSE_Key buffers.
   * @throws {Error} - If the signing fails or inputs are invalid.
   */
  public static sign(message: Uint8Array, address: Address, signingKey: Ed25519PrivateKey): Cip8SignResult {
    const module = getModule();

    const messagePtr = module._malloc(message.length);
    const coseSign1OutPtr = module._malloc(4);
    const coseKeyOutPtr = module._malloc(4);

    try {
      module.HEAPU8.set(message, messagePtr);

      const result = module.cip8_sign(
        messagePtr,
        message.length,
        address.ptr,
        signingKey.ptr,
        coseSign1OutPtr,
        coseKeyOutPtr
      );

      assertSuccess(result, 'CIP-8 signing with address failed');

      const coseSign1Ptr = module.getValue(coseSign1OutPtr, 'i32');
      const coseKeyPtr = module.getValue(coseKeyOutPtr, 'i32');

      const coseSign1 = readBufferData(coseSign1Ptr);
      const coseKey = readBufferData(coseKeyPtr);

      return { coseKey, coseSign1 };
    } finally {
      module._free(messagePtr);
      module._free(coseSign1OutPtr);
      module._free(coseKeyOutPtr);
    }
  }

  /**
   * Signs arbitrary data and binds the signature to a key hash.
   *
   * @param {Uint8Array} message - The raw message bytes to sign.
   * @param {Uint8Array} keyHash - The raw bytes of the Blake2b-224 key hash (28 bytes) to bind the signature to.
   * @param {Ed25519PrivateKey} signingKey - The Ed25519 private key wrapper object.
   * @returns {Cip8SignResult} - An object containing the COSE_Sign1 and COSE_Key buffers.
   * @throws {Error} - If the signing fails or inputs are invalid.
   */
  public static signEx(message: Uint8Array, keyHash: Uint8Array, signingKey: Ed25519PrivateKey): Cip8SignResult {
    const module = getModule();
    const messagePtr = module._malloc(message.length);

    const coseSign1OutPtr = module._malloc(4);
    const coseKeyOutPtr = module._malloc(4);

    const blake2bHash = blake2bHashFromBytes(keyHash);
    try {
      module.HEAPU8.set(message, messagePtr);

      const result = module.cip8_sign_ex(
        messagePtr,
        message.length,
        blake2bHash,
        signingKey.ptr,
        coseSign1OutPtr,
        coseKeyOutPtr
      );

      assertSuccess(result, 'CIP-8 signing with key hash failed');

      const coseSign1Ptr = module.getValue(coseSign1OutPtr, 'i32');
      const coseKeyPtr = module.getValue(coseKeyOutPtr, 'i32');

      const coseSign1 = readBufferData(coseSign1Ptr);
      const coseKey = readBufferData(coseKeyPtr);

      return { coseKey, coseSign1 };
    } finally {
      unrefObject(blake2bHash);
      module._free(messagePtr);
      module._free(coseSign1OutPtr);
      module._free(coseKeyOutPtr);
    }
  }
}
