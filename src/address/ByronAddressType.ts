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

/* DEFINITIONS ****************************************************************/

/**
 * Enumerates the types of spending data associated with Byron addresses.
 *
 * This enumeration defines the type of data that can be associated with a Byron address.
 * Each type corresponds to a different method of controlling the spending of funds.
 */
export enum ByronAddressType {
  /**
   * Indicates that the address uses a public key to control spending.
   * The payload for this address type is a public key.
   */
  PubKey = 0,

  /**
   * Indicates that the address uses a script to control spending.
   * The payload for this address type includes the script itself and possibly its version,
   * depending on the script type.
   */
  Script = 1,

  /**
   * Indicates that the address uses a redeem public key.
   * Redeem addresses are a special type of address mainly used during the initial
   * distribution phase of ADA. The payload is a redeem public key.
   */
  Redeem = 2
}
