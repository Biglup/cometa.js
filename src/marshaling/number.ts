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

import { getModule } from '../module';

/* CONSTANTS *****************************************************************/

export const MIN_SIGNED_64BIT = -(2n ** 63n);
export const MAX_SIGNED_64BIT = 2n ** 63n - 1n;
export const MAX_UNSIGNED_64BIT = 2n ** 64n - 1n;

/* DEFINITIONS ****************************************************************/

/**
 * @hidden
 * Splits a 64-bit integer into its lower and upper 32-bit components.
 *
 * This function takes a `number` or `bigint` value and splits it into two 32-bit integers,
 * representing the lower and upper 32 bits of the original 64-bit value.
 *
 * @param value - A 64-bit integer represented as a JavaScript `number` or `bigint`. If `value` is a `number`,
 * it is internally converted to a `bigint` for precise bitwise operations.
 *
 * @returns An object containing:
 * - `low`: The lower 32 bits of the input value, as a `number`.
 * - `high`: The upper 32 bits of the input value, as a `number`.
 *
 * @throws If the input value exceeds the 64-bit integer range or if the resulting parts cannot be safely
 * represented as JavaScript `number`.
 */
export const splitToLowHigh64bit = (value: number | bigint): { low: number; high: number } => {
  const bigIntValue: bigint = typeof value === 'number' ? BigInt(value) : value;

  if (bigIntValue < MIN_SIGNED_64BIT || bigIntValue > MAX_UNSIGNED_64BIT) {
    throw new RangeError(`Value ${bigIntValue} exceeds the 64-bit integer range.`);
  }

  const low = Number(bigIntValue & 0xffffffffn);
  const high = Number(bigIntValue >> 32n);

  return { high, low };
};

/**
 * @hidden
 * Reads a 64-bit integer (signed or unsigned) from memory and returns it as a `bigint`.
 *
 * This function reads a 64-bit value split into two 32-bit integers (low and high) from a given
 * memory address. It combines the two parts to reconstruct the full 64-bit value. The value
 * can be interpreted as either signed or unsigned, based on the `isSigned` parameter.
 *
 * @param ptr - The memory address (pointer) where the 64-bit integer is located.
 * @param isSigned - A boolean indicating whether the value should be interpreted as signed (`true`) or unsigned (`false`).
 *
 * @returns The reconstructed 64-bit integer as a `bigint`. For signed integers, the value includes
 *          negative representation if applicable. For unsigned integers, the value is always non-negative.
 */
export const readI64 = (ptr: any, isSigned = false): bigint => {
  const module = getModule();

  const low = BigInt(module.getValue(ptr, 'i32')) & 0xffffffffn;
  const high = BigInt(module.getValue(ptr + 4, 'i32')) & 0xffffffffn;

  const combined = (high << 32n) | low;

  if (isSigned && combined >= 0x8000000000000000n) {
    return combined - 0x10000000000000000n;
  }

  return combined;
};

/**
 * @hidden
 * Writes a 64-bit integer to memory at the specified pointer.
 *
 * @param ptr The pointer to write to.
 * @param value The value to write (can be number or bigint).
 * @param signed Whether to treat the value as signed (default: true).
 */
export const writeI64 = (ptr: number, value: number | bigint, signed = true): void => {
  const module = getModule();
  const bigValue = BigInt(value);

  const low = Number(bigValue & 0xffffffffn);
  let high = Number((bigValue >> 32n) & 0xffffffffn);

  if (signed && bigValue < 0n) {
    high |= 0xffffffff00000000;
  }

  module.setValue(ptr, low, 'i32');
  module.setValue(ptr + 4, high, 'i32');
};
