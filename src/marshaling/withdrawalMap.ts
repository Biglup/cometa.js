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

import { RewardAddress } from '../address';
import { Withdrawals } from '../common';
import { assertSuccess, unrefObject } from './object';
import { getModule } from '../module';
import { splitToLowHigh64bit } from './number';
import { writeStringToMemory } from './string';

/* DEFINITIONS ****************************************************************/

/**
 * @hidden
 * Deserializes a native C `cardano_withdrawal_map_t` into a JavaScript `Withdrawals` object.
 *
 * @param {number} mapPtr - A pointer to the native `cardano_withdrawal_map_t` object.
 * @returns {Withdrawals} The deserialized JavaScript `Withdrawals` object.
 */
export const readWithdrawalMap = (mapPtr: number): Withdrawals => {
  const module = getModule();
  const result: Withdrawals = {};
  const length = module.withdrawal_map_get_length(mapPtr);

  for (let i = 0; i < length; i++) {
    const rewardAddressPtrPtr = module._malloc(4);
    const amountPtr = module._malloc(8);
    let rewardAddressPtr = 0;

    try {
      assertSuccess(
        module.withdrawal_map_get_key_value_at(mapPtr, i, rewardAddressPtrPtr, amountPtr),
        `Failed to get withdrawal at index ${i}`
      );

      rewardAddressPtr = module.getValue(rewardAddressPtrPtr, 'i32');
      const rewardAddress = new RewardAddress(rewardAddressPtr);

      const low = module.getValue(amountPtr, 'i32') >>> 0;
      const high = module.getValue(amountPtr + 4, 'i32');
      result[rewardAddress.toBech32()] = (BigInt(high) << 32n) | BigInt(low);
    } finally {
      module._free(rewardAddressPtrPtr);
      module._free(amountPtr);
    }
  }

  return result;
};

/**
 * @hidden
 * Serializes a JavaScript `Withdrawals` map object into a native C `cardano_withdrawal_map_t`.
 *
 * @param {Withdrawals} withdrawals - The JavaScript withdrawal map to serialize.
 * @returns {number} A pointer to the newly created native `cardano_withdrawal_map_t` object.
 */
export const writeWithdrawalMap = (withdrawals: Withdrawals): number => {
  const module = getModule();
  const mapPtrPtr = module._malloc(4);
  let mapPtr = 0;

  try {
    assertSuccess(module.withdrawal_map_new(mapPtrPtr), 'Failed to create withdrawal map');
    mapPtr = module.getValue(mapPtrPtr, 'i32');

    for (const [address, amount] of Object.entries(withdrawals)) {
      const addressPtr = writeStringToMemory(address);
      const amountParts = splitToLowHigh64bit(amount);
      try {
        assertSuccess(
          module.withdrawal_map_insert_ex(mapPtr, addressPtr, address.length, amountParts.low, amountParts.high),
          `Failed to insert withdrawal for address: ${address}`
        );
      } finally {
        module._free(addressPtr);
      }
    }

    return mapPtr;
  } catch (error) {
    if (mapPtr) {
      unrefObject(mapPtr);
    }
    throw error;
  } finally {
    module._free(mapPtrPtr);
  }
};
