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

/**
 * Defines the network identifiers used within the Cardano ecosystem.
 *
 * This enumeration is used to specify the network for which a Cardano transaction or operation is intended.
 *
 * @enum {number}
 */
export enum NetworkId {
  /** Represents the test network (testnet). */
  Testnet = 0,

  /** Represents the main network (mainnet). */
  Mainnet = 1
}
