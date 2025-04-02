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
 * Attributes specific to Byron addresses in the Cardano blockchain.
 *
 * This type holds optional attributes associated with Byron addresses. Byron addresses were used during
 * the Byron era of the Cardano blockchain. The `derivationPath` attribute was utilized by legacy random wallets
 * for key derivation, a practice that has since been replaced by more modern wallet structures such as Yoroi and
 * Icarus. The `magic` attribute serves as a network tag, used primarily on test networks to distinguish between
 * different network environments.
 */
export interface ByronAddressAttributes {
  /**
   * Holds the derivation path used by legacy wallets as a hex string.
   */
  derivationPath: string;

  /**
   * Network magic identifier used for network discrimination, primarily relevant in test network scenarios.
   * This value helps ensure that transactions are broadcast on the correct Cardano network.
   * It will be set to -1 if the address is not associated with a specific network.
   */
  magic: number;
}
