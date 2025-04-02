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
 * Represents a stake pointer in the Cardano blockchain.
 *
 * A stake pointer references a stake credential by its location in the blockchain
 * using three components:
 * - slot: The slot number where the stake credential is located
 * - txIndex: The transaction index within the slot
 * - certIndex: The certificate index within the transaction
 */
export interface StakePointer {
  /**
   * The slot number where the stake credential is located.
   */
  slot: bigint;

  /**
   * The transaction index within the slot.
   */
  txIndex: number;

  /**
   * The certificate index within the transaction.
   */
  certIndex: number;
}
