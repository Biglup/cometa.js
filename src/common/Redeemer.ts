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

/* IMPORTS **************************************************************/

import { ExUnits } from './ExUnits';
import { PlutusData } from './PlutusData';

/* DEFINITIONS **********************************************************/

/**
 * Enum representing the purpose of a redeemer in a Plutus script.
 * Each purpose corresponds to a specific action that the redeemer is intended to perform.
 */
export enum RedeemerPurpose {
  spend = 'spend',
  mint = 'mint',
  certificate = 'certificate',
  withdrawal = 'withdrawal',
  propose = 'propose',
  vote = 'vote'
}

/**
 * Interface representing a redeemer for a Plutus script.
 */
export interface Redeemer {
  index: number;
  purpose: RedeemerPurpose;
  data: PlutusData;
  executionUnits: ExUnits;
}
