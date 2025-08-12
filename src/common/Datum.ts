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

import { PlutusData } from './PlutusData';

/* DEFINITIONS ****************************************************************/

/**
 * Enumeration representing the type of datum.
 * It can either be a data hash or inline data.
 */
export enum DatumType {
  /**
   * Represents a datum that is a data hash.
   */
  DataHash = 0,
  /**
   * Represents a datum that is inline data.
   */
  InlineData = 1
}

/**
 * Interface representing a datum in the Cardano blockchain.
 */
export type Datum = {
  /**
   * The type of the datum, indicating whether it is a data hash or inline data.
   */
  type: DatumType;
  /**
   * The inline data if the datum is of type InlineData.
   */
  inlineDatum?: PlutusData;
  /**
   * The hash of the datum if the datum is of type DataHash in the form of a hex string.
   */
  datumHash?: string;
};
