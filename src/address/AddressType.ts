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
 * Enumerates types of addresses used within the Cardano blockchain in the Shelley era and beyond.
 *
 * Shelley introduces several different types of addresses, each serving distinct purposes and supporting different functionalities.
 * In addition to these new address types, Shelley continues to support Byron-era bootstrap addresses.
 *
 * @enum {number}
 */
export enum AddressType {
  /**
   * Base addresses with both payment and stake credentials as key hashes.
   *
   * Bit pattern:
   * - bits 7-6: 00
   * - bit  5:  stake cred is keyhash
   * - bit  4:  payment cred is keyhash
   * - bits 3-0: network id
   *
   * @readonly
   */
  BasePaymentKeyStakeKey = 0b0000,

  /**
   * Base addresses with payment credentials as script hash and stake credentials as key hash.
   *
   * Bit pattern:
   * - bits 7-6: 00
   * - bit  5:  stake cred is keyhash
   * - bit  4:  payment cred is scripthash
   * - bits 3-0: network id
   *
   * @readonly
   */
  BasePaymentScriptStakeKey = 0b0001,

  /**
   * Base addresses with payment credentials as key hash and stake credentials as script hash.
   *
   * Bit pattern:
   * - bits 7-6: 00
   * - bit  5:  stake cred is scripthash
   * - bit  4:  payment cred is keyhash
   * - bits 3-0: network id
   *
   * @readonly
   */
  BasePaymentKeyStakeScript = 0b0010,

  /**
   * Base addresses with both payment and stake credentials as script hashes.
   *
   * Bit pattern:
   * - bits 7-6: 00
   * - bit  5:  stake cred is scripthash
   * - bit  4:  payment cred is scripthash
   * - bits 3-0: network id
   *
   * @readonly
   */
  BasePaymentScriptStakeScript = 0b0011,

  /**
   * Pointer addresses with payment credential as keyhash.
   *
   * Bit pattern:
   * - bits 7-5: 010
   * - bit  4:  payment cred is keyhash
   * - bits 3-0: network id
   *
   * @readonly
   */
  PointerKey = 0b0100,

  /**
   * Pointer addresses with payment credential as scripthash.
   *
   * Bit pattern:
   * - bits 7-5: 010
   * - bit  4:  payment cred is scripthash
   * - bits 3-0: network id
   *
   * @readonly
   */
  PointerScript = 0b0101,

  /**
   * Enterprise addresses with payment credential as keyhash.
   *
   * Bit pattern:
   * - bits 7-5: 010
   * - bit  4:  payment cred is keyhash
   * - bits 3-0: network id
   *
   * @readonly
   */
  EnterpriseKey = 0b0110,

  /**
   * Enterprise addresses with payment credential as scripthash.
   *
   * Bit pattern:
   * - bits 7-5: 010
   * - bit  4:  payment cred is scripthash
   * - bits 3-0: network id
   *
   * @readonly
   */
  EnterpriseScript = 0b0111,

  /**
   * Byron-era bootstrap addresses, continuing support for backward compatibility.
   *
   * Bit pattern:
   * - bits 7-4: 1000
   * - bits 3-0: unrelated data (no network ID in Byron addresses)
   *
   * @readonly
   */
  Byron = 0b1000,

  /**
   * Reward account addresses with credential as keyhash.
   *
   * Bit pattern:
   * - bits 7-5: 111
   * - bit  4:  credential is keyhash
   * - bits 3-0: network id
   *
   * @readonly
   */
  RewardKey = 0b1110,

  /**
   * Reward account addresses with credential as scripthash.
   *
   * Bit pattern:
   * - bits 7-5: 111
   * - bit  4:  credential is scripthash
   * - bits 3-0: network id
   *
   * @readonly
   */
  RewardScript = 0b1111

  // 1001-1101 are reserved for future formats
}
