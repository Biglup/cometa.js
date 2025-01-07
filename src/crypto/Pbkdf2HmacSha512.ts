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

import { assertSuccess } from '../marshaling';
import { getModule } from '../module';

/* DEFINITIONS ****************************************************************/

/**
 * A utility class for key derivation using the PBKDF2 algorithm with HMAC-SHA512.
 *
 * PBKDF2 (Password-Based Key Derivation Function 2) is a cryptographic algorithm used to derive secure keys
 * from a password. It applies a pseudorandom function (HMAC-SHA512 in this case) to the input password and salt,
 * repeatedly applying it for a specified number of iterations. This process increases the computational cost,
 * making brute force attacks more difficult.
 */
export class Pbkdf2HmacSha512 {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  /**
   * Derives a cryptographic key using the PBKDF2 algorithm with HMAC-SHA512.
   *
   * @param {Uint8Array} password - The password or passphrase to derive the key from.
   * @param {Uint8Array} salt - A cryptographic salt to add randomness to the key derivation.
   * @param {number} iterations - The number of iterations to perform for increased security.
   * @param {number} derivedKeyLength - The desired length of the derived key in bytes.
   * @returns {Uint8Array} The derived key as a binary array.
   *
   * @throws {Error} If the key derivation operation fails.
   *
   * @example
   * const password = new TextEncoder().encode('secure-password');
   * const salt = new TextEncoder().encode('unique-salt');
   * const iterations = 100000;
   * const derivedKeyLength = 32;
   * const derivedKey = Pbkdf2.pbkdf2HmacSha512(password, salt, iterations, derivedKeyLength);
   * console.log('Derived Key:', derivedKey);
   */
  public static compute(
    password: Uint8Array,
    salt: Uint8Array,
    iterations: number,
    derivedKeyLength: number
  ): Uint8Array {
    const module = getModule();
    const passwordPtr = module._malloc(password.length);
    const saltPtr = module._malloc(salt.length);
    const derivedKeyPtr = module._malloc(derivedKeyLength);

    try {
      module.HEAPU8.set(password, passwordPtr);
      module.HEAPU8.set(salt, saltPtr);

      const result = module.crypto_pbkdf2_hmac_sha512(
        passwordPtr,
        password.length,
        saltPtr,
        salt.length,
        iterations,
        derivedKeyPtr,
        derivedKeyLength
      );

      assertSuccess(result, 'PBKDF2 key derivation failed.');

      return new Uint8Array(module.HEAPU8.subarray(derivedKeyPtr, derivedKeyPtr + derivedKeyLength));
    } finally {
      // Zero out sensitive data in memory before freeing
      module.HEAPU8.fill(0, passwordPtr, passwordPtr + password.length);
      module.HEAPU8.fill(0, saltPtr, saltPtr + salt.length);
      module.HEAPU8.fill(0, derivedKeyPtr, derivedKeyPtr + derivedKeyLength);

      module._free(passwordPtr);
      module._free(saltPtr);
      module._free(derivedKeyPtr);
    }
  }
}
