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

import { TxIn } from './TxIn';
import { TxOut } from './TxOut';

/* DEFINITIONS **************************************************************/

/**
 * Interface representing an unspent transaction output (UTxO) in the Cardano blockchain.
 */
export interface UTxO {
  /**
   * The transaction input that this UTxO is associated with, which includes the
   * transaction ID and index of the output.
   */
  input: TxIn;
  /**
   * The transaction output that this UTxO represents, which contains the value and
   * any associated data or scripts.
   */
  output: TxOut;
}
