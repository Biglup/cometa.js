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
 * Interface representing a cost model with a language version and an array of costs.
 */
export interface CostModel {
  /**
   * The language version of the cost model.
   */
  language: string;
  /**
   * An array of costs associated with the cost model.
   * Each cost corresponds to a specific operation or computation in the Plutus language.
   */
  costs: number[];
}
