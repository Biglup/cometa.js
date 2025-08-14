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
 * Interface representing a transaction input in the Cardano blockchain.
 */
export interface TxIn {
  /**
   * The transaction ID (txId) of the transaction that this input is part of. In
   * hexadecimal format, it uniquely identifies the transaction.
   */
  txId: string;

  /**
   * The index of the output in the transaction that this input refers to.
   */
  index: number;
}
