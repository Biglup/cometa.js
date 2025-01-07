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

/* IMPORTS ********************************************************************/

import { assertSuccess, readBufferData } from '../marshaling';
import { getModule } from '../module';

/* DEFINITIONS ****************************************************************/

/**
 * Provides methods for encrypting and decrypting data using the EMIP-003 standard.
 */
export class Emip003 {
  /**
   * Encrypts data using the EMIP-003 standard with password-based key derivation.
   *
   * @param {Uint8Array} data - The data to encrypt.
   * @param {Uint8Array} passphrase - The passphrase to use for encryption.
   * @returns {Uint8Array} - The encrypted data.
   * @throws {Error} - Throws an error if encryption fails.
   */
  public static encrypt(data: Uint8Array, passphrase: Uint8Array): Uint8Array {
    const module = getModule();
    const dataPtr = module._malloc(data.length);
    const passphrasePtr = module._malloc(passphrase.length);
    const encryptedDataPtrPtr = module._malloc(4);

    try {
      module.HEAPU8.set(data, dataPtr);
      module.HEAPU8.set(passphrase, passphrasePtr);

      const result = module.crypto_emip3_encrypt(
        dataPtr,
        data.length,
        passphrasePtr,
        passphrase.length,
        encryptedDataPtrPtr
      );

      assertSuccess(result, 'EMIP-003 encryption failed.');

      const bufferObjPtr = module.getValue(encryptedDataPtrPtr, 'i32');
      return readBufferData(bufferObjPtr);
    } finally {
      module._free(dataPtr);
      module._free(passphrasePtr);
      module._free(encryptedDataPtrPtr);
    }
  }

  /**
   * Decrypts data that was encrypted using the EMIP-003 standard.
   *
   * @param {Uint8Array} encryptedData - The data to decrypt.
   * @param {string} passphrase - The passphrase to use for decryption.
   * @returns {Uint8Array} - The decrypted data.
   * @throws {Error} - Throws an error if decryption fails.
   */
  public static decrypt(encryptedData: Uint8Array, passphrase: Uint8Array): Uint8Array {
    const module = getModule();
    const encryptedDataPtr = module._malloc(encryptedData.length);
    const passphrasePtr = module._malloc(passphrase.length);
    const dataPtrPtr = module._malloc(4);

    try {
      module.HEAPU8.set(encryptedData, encryptedDataPtr);
      module.HEAPU8.set(passphrase, passphrasePtr);

      const result = module.crypto_emip3_decrypt(
        encryptedDataPtr,
        encryptedData.length,
        passphrasePtr,
        passphrase.length,
        dataPtrPtr
      );

      assertSuccess(result, 'EMIP-003 decryption failed.');

      const bufferObjPtr = module.getValue(dataPtrPtr, 'i32');
      return readBufferData(bufferObjPtr);
    } finally {
      module._free(encryptedDataPtr);
      module._free(passphrasePtr);
      module._free(dataPtrPtr);
    }
  }
}
