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

/* IMPORTS *******************************************************************/

import { PlutusData } from './PlutusData';
import { UTxO } from './UTxO';

/* DEFINITIONS ****************************************************************/

/**
 * Derive a redeemer from the balanced draft CBOR and canonically ordered inputs.
 * Called on each balancing iteration; must be synchronous, pure and deterministic.
 * Sub-transaction builders supply a transaction-shaped draft with local input indices.
 */
export type DeferredRedeemer = (draftTransaction: string, resolvedInputs: UTxO[]) => PlutusData;
