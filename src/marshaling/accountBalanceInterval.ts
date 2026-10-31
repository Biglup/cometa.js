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

import { AccountBalanceInterval } from '../common/AccountBalanceInterval';
import { getModule } from '../module';
import { assertSuccess } from './object';
import { splitToLowHigh64bit, readI64 } from './number';

/* DEFINITIONS ****************************************************************/

const checked = (value: bigint): bigint => {
  if (value < 0n || value > 0xffffffffffffffffn) throw new RangeError('Account balance must fit uint64.');
  return value;
};

/** @hidden */
export const writeAccountBalanceInterval = (interval: AccountBalanceInterval): number => {
  const m = getModule();
  const memory = m._malloc(20);
  try {
    if (interval.exact !== undefined) {
      const { low, high } = splitToLowHigh64bit(checked(interval.exact));
      assertSuccess(m.account_balance_interval_new_exact(low, high, memory));
      return m.getValue(memory, 'i32');
    }
    {
      const lower = interval.inclusiveLowerBound;
      const upper = interval.exclusiveUpperBound;
      if (lower === undefined && upper === undefined)
        throw new RangeError('At least one account balance bound is required.');
      if (lower !== undefined && upper !== undefined && lower >= upper)
        throw new RangeError('Account balance bounds define an empty interval.');
      for (const [value, offset] of [
        [lower, 4],
        [upper, 12]
      ] as const) {
        if (value !== undefined) {
          const { low, high } = splitToLowHigh64bit(checked(value));
          m.setValue(memory + offset, low, 'i32');
          m.setValue(memory + offset + 4, high, 'i32');
        }
      }
      assertSuccess(
        m.account_balance_interval_new(
          lower === undefined ? 0 : memory + 4,
          upper === undefined ? 0 : memory + 12,
          memory
        )
      );
    }
    return m.getValue(memory, 'i32');
  } finally {
    m._free(memory);
  }
};

/** @hidden */
export const readAccountBalanceInterval = (ptr: number): AccountBalanceInterval => {
  const m = getModule();
  const exact = m.account_balance_interval_get_exact_balance(ptr);
  if (exact) return { exact: BigInt.asUintN(64, readI64(exact)) };
  const lower = m.account_balance_interval_get_inclusive_lower_bound(ptr);
  const upper = m.account_balance_interval_get_exclusive_upper_bound(ptr);
  if (lower) return { inclusiveLowerBound: readI64(lower), ...(upper ? { exclusiveUpperBound: readI64(upper) } : {}) };
  if (upper) return { exclusiveUpperBound: readI64(upper) };
  throw new Error('Account interval has no bounds.');
};
