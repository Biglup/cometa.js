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

/**
 * Represents a CIP-30 compatible Cardano wallet for dApp interaction.
 */
export interface Cip30Wallet {
  /**
   * Returns the wallet's current network ID.
   * @returns {Promise<number>} A promise that resolves to the network ID (0 for Testnet, 1 for Mainnet).
   * @remarks This is used to ensure the dApp and wallet are operating on the same network.
   */
  getNetworkId(): Promise<number>;

  /**
   * Returns a list of all Unspent Transaction Outputs (UTXOs) controlled by the wallet.
   * @returns {Promise<string[] | undefined>} A promise that resolves to an array of UTXOs.
   * @remarks UTXOs represent the "coins" or assets in the wallet that are available to be spent.
   */
  getUtxos(): Promise<string[] | undefined>;

  /**
   * Returns the total balance of all assets controlled by the wallet.
   * @returns {Promise<string>} A promise that resolves to the wallet's total balance, including Lovelace and any native tokens.
   */
  getBalance(): Promise<string>;

  /**
   * Returns a list of addresses that have been used in past transactions.
   * @returns {Promise<string[]>} A promise that resolves to an array of used, Bech32-encoded addresses.
   */
  getUsedAddresses(): Promise<string[]>;

  /**
   * Returns a list of unused addresses for receiving payments.
   * @returns {Promise<string[]>} A promise that resolves to an array of unused, Bech32-encoded addresses.
   * @remarks Using a fresh address for each transaction can improve user privacy.
   */
  getUnusedAddresses(): Promise<string[]>;

  /**
   * Returns a single, unused address suitable for receiving change from a transaction.
   * @returns {Promise<string>} A promise that resolves to a Bech32-encoded change address.
   */
  getChangeAddress(): Promise<string>;

  /**
   * Returns the wallet's reward addresses, used for receiving staking rewards.
   * @returns {Promise<string[]>} A promise that resolves to an array of Bech32-encoded reward addresses.
   */
  getRewardAddresses(): Promise<string[]>;

  /**
   * Requests the user to sign a given transaction.
   * @param {string} tx - The transaction to be signed, provided as a CBOR hex string.
   * @param {boolean} partialSign - If true, the wallet will only add its witness and not require all signatures to be present. This is for multi-signature transactions.
   * @returns {Promise<string>} A promise that resolves to the CBOR hex string of the transaction witness set.
   */
  signTx(tx: string, partialSign: boolean): Promise<string>;

  /**
   * Requests the user to sign arbitrary data with a specific address, compliant with CIP-8.
   * @param {string} address - The Bech32-encoded address to sign with.
   * @param {string} payload - The hex-encoded data payload to be signed.
   * @returns {Promise<{ signature: string; key: string }>} A promise that resolves to the signature and public key.
   * @remarks This is useful for proving ownership of an address without creating a blockchain transaction.
   */
  signData(address: string, payload: string): Promise<{ signature: string; key: string }>;

  /**
   * Submits a fully signed transaction to the blockchain through the wallet's provider.
   * @param {string} tx - The fully signed transaction, provided as a CBOR hex string.
   * @returns {Promise<string>} A promise that resolves to the transaction ID (hash).
   */
  submitTx(tx: string): Promise<string>;

  /**
   * Returns a list of UTXOs that are designated as collateral.
   * @returns {Promise<string[]>} A promise that resolves to an array of collateral UTXOs.
   * @remarks Collateral is required for transactions that interact with Plutus smart contracts to cover potential script execution failure fees.
   */
  getCollateral(): Promise<string[]>;

  /**
   * Namespace for CIP-142 methods.
   * @see {@link https://cips.cardano.org/cip/CIP-142}
   */
  cip142: {
    /**
     * Returns the "network magic," a unique number identifying the Cardano network.
     * @returns {Promise<number>} A promise that resolves to the network magic number (e.g., Mainnet: `764824073`, Preprod: `1`).
     */
    getNetworkMagic: () => Promise<number>;
  };

  /**
   * Namespace for CIP-95 governance methods, supporting the Voltaire era.
   * @see {@link https://cips.cardano.org/cip/CIP-95}
   */
  cip95: {
    /**
     * Returns the wallet's active public DRep (Delegated Representative) key.
     * @returns {Promise<string>} A promise that resolves to the hex-encoded public DRep key.
     */
    getPubDRepKey: () => Promise<string>;
    /**
     * Returns public stake keys from the wallet that are currently registered for on-chain governance voting.
     * @returns {Promise<string[]>} A promise that resolves to an array of hex-encoded public stake keys.
     */
    getRegisteredPubStakeKeys: () => Promise<string[]>;
    /**
     * Returns public stake keys from the wallet that are NOT yet registered for on-chain governance voting.
     * @returns {Promise<string[]>} A promise that resolves to an array of hex-encoded public stake keys.
     */
    getUnregisteredPubStakeKeys: () => Promise<string[]>;
  };
}
