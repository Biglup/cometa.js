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

import { Redeemer, UTxO } from '../../common';

/* DEFINITIONS ****************************************************************/

/**
 * Interface for transaction evaluation strategies. This will compute the required
 * execution units for each redeemer in a transaction.
 */
export interface TxEvaluator {
  /**
   * Gets the human-readable name of the coin selection strategy.
   * @returns {string} The name of the selector.
   */
  getName(): string;

  /**
   * Run transaction evaluation to obtain script redeemers / execution units.
   *
   * @param tx - Transaction payload to evaluate (hex-encoded CBOR).
   * @param additionalUtxos - Optional extra UTxOs the evaluator may consider for inputs/collateral.
   * @returns Promise that resolves to a list of redeemers (with costs/ex-units) for the transaction.
   */
  evaluate(tx: string, additionalUtxos?: UTxO[]): Promise<Redeemer[]>;
}
