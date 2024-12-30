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

/* DEFINITIONS ****************************************************************/

/**
 * Enum representing CBOR simple values (major type 7).
 * These are simple, predefined constants in the CBOR encoding.
 */
export enum CborSimpleValue {
  /**
   * CBOR simple value representing the boolean value `false`.
   *
   * In CBOR, the value `false` is encoded as a simple value with the major type 7 and additional information 20.
   */
  False = 20,

  /**
   * CBOR simple value representing the boolean value `true`.
   *
   * In CBOR, the value `true` is encoded as a simple value with the major type 7 and additional information 21.
   */
  True = 21,

  /**
   * CBOR simple value representing `null`.
   *
   * In CBOR, the value `null` is encoded as a simple value with the major type 7 and additional information 22.
   */
  Null = 22,

  /**
   * CBOR simple value representing `undefined`.
   *
   * This value can be used by an encoder to substitute a data item with an encoding problem.
   * In CBOR, the value `undefined` is encoded as a simple value with the major type 7 and additional information 23.
   */
  Undefined = 23
}
