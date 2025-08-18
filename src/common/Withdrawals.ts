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

import { RewardAddress } from '../address';

/* DEFINITIONS **************************************************************/

/**
 * Represents a map of withdrawals where keys are Bech32-encoded reward addresses
 * and values are the corresponding amounts in lovelace.
 */
export type Withdrawals = Record<string, bigint>;

/**
 * Immutably adds or updates a withdrawal entry in a withdrawals map.
 *
 * This function takes an existing withdrawals map and returns a new map
 * containing all original entries plus the new or updated one. The original
 * map is not modified.
 *
 * @param {Withdrawals} withdrawals - The initial map of withdrawals.
 * @param {string | RewardAddress} address - The recipient's reward address, as a Bech32 string or a RewardAddress object.
 * @param {bigint} amount - The amount of lovelace to withdraw.
 * @returns {Withdrawals} A new withdrawals map including the new entry.
 * @example
 * let withdrawals: Withdrawals = {};
 * withdrawals = addWithdrawal(withdrawals, 'stake1u89s33n55j2xv58qj7jklp9z5f4q9c9..., 1000000n);
 * withdrawals = addWithdrawal(withdrawals, 'stake1u98s33n55j2xv58qj7jklp9z5f4q9c9...', 2500000n);
 * // withdrawals is now {
 * //   'stake1u89s33n55j2xv58qj7jklp9z5f4q9c9...': 1000000n,
 * //   'stake1u89s33n55j2xv58qj7jklp9z5f4q9c9...': 2500000n
 * // }
 */
export const addWithdrawal = (
  withdrawals: Withdrawals,
  address: string | RewardAddress,
  amount: bigint
): Withdrawals => {
  const addrStr = typeof address === 'string' ? address : address.toBech32();
  return {
    ...withdrawals,
    [addrStr]: amount
  };
};
