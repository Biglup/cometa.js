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

import { Address, NetworkId, RewardAddress } from '../address';
import { UTxO, Value, VkeyWitnessSet } from '../common';

/* EXPORTS ********************************************************************/

/**
 * Defines the standard interface for a Cardano wallet.
 * This interface provides dApps with a consistent way to interact with a user's wallet for querying information
 * and requesting transaction creation.
 */
export interface Wallet {
  /**
   * Returns the wallet's current network ID.
   * @returns {Promise<NetworkId>} A promise that resolves to the network ID (0 for Testnet, 1 for Mainnet).
   * @remarks This is used to ensure the dApp and wallet are operating on the same network.
   */
  getNetworkId(): Promise<NetworkId>;

  /**
   * Returns a list of all Unspent Transaction Outputs (UTxOs) controlled by the wallet.
   * @returns {Promise<UTxO[]>} A promise that resolves to an array of UTxOs.
   * @remarks UTxOs represent the "coins" or assets in the wallet that are available to be spent.
   */
  getUnspentOutputs(): Promise<UTxO[]>;

  /**
   * Returns the total balance of all assets controlled by the wallet.
   * @returns {Promise<Value>} A promise that resolves to the wallet's total balance, including Lovelace and any native tokens.
   */
  getBalance(): Promise<Value>;

  /**
   * Returns a list of addresses that have been used in past transactions.
   * @returns {Promise<string[]>} A promise that resolves to an array of used, Bech32-encoded addresses.
   */
  getUsedAddresses(): Promise<Address[]>;

  /**
   * Returns a list of unused addresses for receiving payments.
   * @returns {Promise<string[]>} A promise that resolves to an array of unused, Bech32-encoded addresses.
   * @remarks Using a fresh address for each transaction can improve user privacy.
   */
  getUnusedAddresses(): Promise<Address[]>;

  /**
   * Returns a single, unused address suitable for receiving change from a transaction.
   * @returns {Promise<string>} A promise that resolves to a Bech32-encoded change address.
   */
  getChangeAddress(): Promise<Address>;

  /**
   * Returns the wallet's reward addresses, used for receiving staking rewards.
   * @returns {Promise<string[]>} A promise that resolves to an array of Bech32-encoded reward addresses.
   */
  getRewardAddresses(): Promise<RewardAddress[]>;

  /**
   * Requests the user to sign a given transaction.
   * @param {string} txCbor - The transaction to be signed, provided as a CBOR hex string.
   * @param {boolean} partialSign - If true, the wallet will only add its witness and not require all signatures to be present. This is for multi-signature transactions.
   * @returns {Promise<VkeyWitness>} A promise that resolves to the CBOR hex string of the transaction witness set.
   */
  signTransaction(txCbor: string, partialSign: boolean): Promise<VkeyWitnessSet>;

  /**
   * Requests the user to sign arbitrary data with a specific address, compliant with CIP-8.
   * @param {Address | string} address - The Bech32-encoded address to sign with.
   * @param {string} payload - The hex-encoded data payload to be signed.
   * @returns {Promise<{ signature: string; key: string }>} A promise that resolves to the signature and public key.
   * @remarks This is useful for proving ownership of an address without creating a blockchain transaction.
   */
  signData(address: Address | string, payload: string): Promise<{ signature: string; key: string }>;

  /**
   * Submits a fully signed transaction to the blockchain through the wallet's provider.
   * @param {string} txCbor - The fully signed transaction, provided as a CBOR hex string.
   * @returns {Promise<string>} A promise that resolves to the transaction ID (hash).
   */
  submitTransaction(txCbor: string): Promise<string>;

  /**
   * Returns a list of UTxOs that are designated as collateral.
   * @returns {Promise<UTxO[]>} A promise that resolves to an array of collateral UTxOs.
   * @remarks Collateral is required for transactions that interact with Plutus smart contracts to cover potential script execution failure fees.
   */
  getCollateral(): Promise<UTxO[]>;
}
