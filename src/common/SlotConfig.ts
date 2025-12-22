/* eslint-disable no-use-before-define */
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

/* DEFINITIONS **********************************************************/

/**
 * Configuration structure for slot timing on the Cardano network.
 *
 * The `SlotConfig` interface encapsulates configuration parameters for
 * converting between Unix time and slots in the Cardano network. This structure
 * provides essential timing information to correctly interpret and compute slot numbers
 * based on network-specific parameters.
 */
export interface SlotConfig {
  /**
   * The start time in milliseconds since the Unix epoch. This time aligns with `zeroSlot` and
   * acts as a baseline for slot and epoch calculations.
   */
  zeroTime: bigint;

  /**
   * The initial slot number corresponding to `zeroTime`. It is the reference slot number that
   * maps directly to `zeroTime`, allowing accurate calculation of other slot numbers relative to
   * this baseline.
   */
  zeroSlot: bigint;

  /**
   * The duration of each slot in milliseconds. This value is crucial for time-to-slot
   * conversions, providing the length of time between consecutive slots.
   */
  slotLength: bigint;
}

/**
 * Mainnet configuration.
 */
export const CARDANO_MAINNET_SLOT_CONFIG: SlotConfig = {
  slotLength: 1000n,
  zeroSlot: 4492800n,
  zeroTime: 1596059091000n
};

/**
 * Preview testnet configuration.
 */
export const CARDANO_PREVIEW_SLOT_CONFIG: SlotConfig = {
  slotLength: 1000n,
  zeroSlot: 0n,
  zeroTime: 1666656000000n
};

/**
 * Preprod testnet configuration.
 */
export const CARDANO_PREPROD_SLOT_CONFIG: SlotConfig = {
  slotLength: 1000n,
  zeroSlot: 86400n,
  zeroTime: 1654041600000n + 1728000000n
};
