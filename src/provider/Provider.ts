/**
 * Copyright 2025 Biglup Labs.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* IMPORTS ********************************************************************/

import { Address, RewardAddress } from '../address';
import { NetworkMagic, ProtocolParameters, Redeemer, TxIn, UTxO } from '../common';

/* DEFINITIONS ****************************************************************/

/**
 * Defines the contract for a blockchain data provider.
 *
 * Implementations of this interface are responsible for fetching on-chain data,
 * submitting transactions, and evaluating transaction costs.
 */
export interface Provider {
  /**
   * Gets the human-readable name of the provider (e.g., "Blockfrost").
   * @returns {string} The name of the provider.
   */
  getName(): string;

  /**
   * Gets the network magic/ID for the provider.
   * @returns {NetworkMagic} The network identifier.
   */
  getNetworkMagic(): NetworkMagic;

  /**
   * Get the current staking rewards balance for a reward account.
   *
   * @param {RewardAddress | string} rewardAccount - Reward account address or bech32 string.
   * @returns {Promise<bigint>} A promise that resolves to the balance in lovelace.
   */
  getRewardsBalance(rewardAccount: RewardAddress | string): Promise<bigint>;

  /**
   * Fetch the current protocol parameters for the network.
   *
   * @returns {Promise<ProtocolParameters>} A promise that resolves to the protocol parameters.
   */
  getParameters(): Promise<ProtocolParameters>;

  /**
   * List all unspent transaction outputs (UTxOs) controlled by an address.
   *
   * @param {Address | string} address - Payment address. Address object or bech32 string.
   * @returns {Promise<UTxO[]>} A promise that resolves to an array of UTxOs.
   */
  getUnspentOutputs(address: Address | string): Promise<UTxO[]>;

  /**
   * List all UTxOs for an address that contain a specific asset.
   *
   * @param {Address | string} address - Payment address. Address object or bech32 string.
   * @param {string} assetId - Asset identifier (policyId + asset name hex).
   * @returns {Promise<UTxO[]>} A promise that resolves to matching UTxOs.
   */
  getUnspentOutputsWithAsset(address: Address | string, assetId: string): Promise<UTxO[]>;

  /**
   * Find the single UTxO that holds a given NFT.
   *
   * @param {string} assetId - NFT asset identifier.
   * @returns {Promise<UTxO>} A promise that resolves to the UTxO containing the NFT.
   */
  getUnspentOutputByNft(assetId: string): Promise<UTxO>;

  /**
   * Resolve concrete UTxOs for a list of transaction inputs.
   *
   * @param {TxIn[]} txIns - Inputs to resolve.
   * @returns {Promise<UTxO[]>} A promise that resolves to an array of UTxOs.
   */
  resolveUnspentOutputs(txIns: TxIn[]): Promise<UTxO[]>;

  /**
   * Fetch an on-chain datum by its hash.
   *
   * @param {string} datumHash - Hash of the datum.
   * @returns {Promise<string>} A promise that resolves to the datum payload (hex-encoded CBOR).
   */
  resolveDatum(datumHash: string): Promise<string>;

  /**
   * Wait for a transaction to be confirmed on-chain.
   *
   * @param {string} txId - Transaction id to confirm.
   * @param {number} [timeout] - Optional timeout in milliseconds.
   * @returns {Promise<boolean>} A promise that resolves to true if confirmed, otherwise false.
   */
  confirmTransaction(txId: string, timeout?: number): Promise<boolean>;

  /**
   * Submit a signed transaction to the network.
   *
   * @param {string} tx - Transaction payload (hex-encoded CBOR).
   * @returns {Promise<string>} A promise that resolves to the submitted transaction id.
   */
  submitTransaction(tx: string): Promise<string>;

  /**
   * Evaluate a transaction to get its execution costs.
   *
   * @param {string} tx - Transaction payload to evaluate.
   * @param {UTxO[]} [additionalUtxos] - Optional extra UTxOs to consider.
   * @returns {Promise<Redeemer[]>} A promise that resolves to a list of redeemers with execution units.
   */
  evaluateTransaction(tx: string, additionalUtxos?: UTxO[]): Promise<Redeemer[]>;
}
