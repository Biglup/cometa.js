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

/* IMPORTS ********************************************************************/

import { UTxO, Value } from '../../common';

/* DEFINITIONS ****************************************************************/

/**
 * Represents the result of a coin selection operation.
 */
export interface CoinSelectorResult {
  /**
   * The set of UTxOs selected to meet or exceed the target value.
   */
  selection: UTxO[];

  /**
   * The remaining UTxOs from the original available set that were not selected.
   */
  remaining: UTxO[];
}

/**
 * Defines the input parameters for a coin selection algorithm.
 */
export interface CoinSelectorParams {
  /**
   * An optional set of UTxOs that must be included in the final selection.
   */
  preSelectedUtxo?: UTxO[];

  /**
   * The pool of available UTxOs from which the algorithm can choose.
   */
  availableUtxo: UTxO[];

  /**
   * The target value that the selection must cover.
   */
  targetValue: Value;
}

/**
 * Defines the contract for a coin selection strategy.
 *
 * Implementations of this interface are responsible for selecting a set of UTxOs
 * from an available pool to cover a target value.
 */
export interface CoinSelector {
  /**
   * Gets the human-readable name of the coin selection strategy.
   * @returns {string} The name of the selector.
   */
  getName(): string;

  /**
   * Performs the coin selection algorithm.
   *
   * @param {CoinSelectorParams} params - The input parameters for the selection.
   * @returns {Promise<CoinSelectorResult>} A promise that resolves to the result of the selection.
   */
  select(params: CoinSelectorParams): Promise<CoinSelectorResult>;
}
