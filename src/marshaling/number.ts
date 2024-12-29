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

/* CONSTANTS *****************************************************************/

export const MIN_SIGNED_64BIT = -(2n ** 63n);
export const MAX_SIGNED_64BIT = 2n ** 63n - 1n;
export const MAX_UNSIGNED_64BIT = 2n ** 64n - 1n;

/* DEFINITIONS ****************************************************************/

/**
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
