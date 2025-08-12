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

/* DEFINITIONS **************************************************************/

/**
 * \brief Enumerates the available Cardano network environments.
 *
 * This enumeration defines the different network environments that can be used
 * with the Cardano provider.
 */
export enum NetworkMagic {
  /**
   * \brief The Pre-Production test network.
   *
   * The Pre-Production network is a Cardano testnet used for testing features
   * before they are deployed to the Mainnet. It closely mirrors the Mainnet
   * environment, providing a final testing ground for applications.
   */
  PREPROD = 1,

  /**
   * \brief The Preview test network.
   *
   * The Preview network is a Cardano testnet used for testing upcoming features
   * before they are released to the Pre-Production network. It allows developers
   * to experiment with new functionalities in a controlled environment.
   */
  PREVIEW = 2,

  /**
   * \brief The SanchoNet test network.
   *
   * SanchoNet is the testnet for rolling out governance features for the Cardano blockchain,
   * aligning with the comprehensive CIP-1694 specifications.
   */
  SANCHONET = 4,

  /**
   * \brief The Mainnet network.
   *
   * The Mainnet is the live Cardano network where real transactions occur.
   * Applications interacting with the Mainnet are dealing with actual ADA and
   * other assets. Caution should be exercised to ensure correctness and security.
   */
  MAINNET = 764824073
}
