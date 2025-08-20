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
import { Cip30Wallet } from './Cip30Wallet';
import { ProtocolParameters, UTxO, Value, VkeyWitnessSet } from '../common';
import { Provider } from '../provider';
import { TransactionBuilder } from '../txBuilder';
import { Wallet } from './Wallet';
import { readUTxOtFromCbor, readValueFromCbor, readVkeyWitnessSetFromCbor } from '../marshaling';

/* DEFINITIONS ****************************************************************/

/**
 * This class acts as an adapter, consuming the raw, CBOR-based API of a CIP-30 wallet
 * and exposing methods that return deserialized, object types from Cometa.
 */
export class BrowserExtensionWallet implements Wallet {
  private cip30Wallet: Cip30Wallet;
  private protocolParams: ProtocolParameters | undefined;
  private provider: Provider;

  /**
   * Constructs a new instance of the BrowserExtensionWallet.
   * @param {Cip30Wallet} cip30Wallet - The raw CIP-30 wallet API provided by the browser extension.
   * @param {Provider} provider - The provider used to fetch additional data.
   */
  public constructor(cip30Wallet: Cip30Wallet, provider: Provider) {
    this.cip30Wallet = cip30Wallet;
    this.provider = provider;
  }

  /**
   * Returns the wallet's current network ID.
   * @returns {Promise<NetworkId>} A promise that resolves to the network ID (0 for Testnet, 1 for Mainnet).
   */
  public async getNetworkId(): Promise<NetworkId> {
    const id = await this.cip30Wallet.getNetworkId();
    return id === 0 ? NetworkId.Testnet : NetworkId.Mainnet;
  }

  /**
   * Fetches the wallet's UTxOs and deserializes them from CBOR into an array of `TxOut` objects.
   * @returns {Promise<UTxO[]>} A promise that resolves to an array of the wallet's UTxOs.
   */
  public async getUnspentOutputs(): Promise<UTxO[]> {
    const utxos = await this.cip30Wallet.getUtxos();
    return (utxos ?? []).map((utxo) => readUTxOtFromCbor(utxo));
  }

  /**
   * Fetches and deserializes the total balance of all assets controlled by the wallet.
   * @returns {Promise<Value>} A promise that resolves to a `Value` object representing the wallet's complete balance.
   */
  public async getBalance(): Promise<Value> {
    const balance = await this.cip30Wallet.getBalance();
    return readValueFromCbor(balance);
  }

  /**
   * Fetches and parses all used addresses controlled by the wallet.
   * @returns {Promise<Address[]>} A promise that resolves to an array of parsed `Address` objects.
   */
  public async getUsedAddresses(): Promise<Address[]> {
    const addresses = await this.cip30Wallet.getUsedAddresses();
    return addresses.map((address) => Address.fromString(address));
  }

  /**
   * Fetches and parses all unused addresses controlled by the wallet.
   * @returns {Promise<Address[]>} A promise that resolves to an array of parsed `Address` objects.
   */
  public async getUnusedAddresses(): Promise<Address[]> {
    const addresses = await this.cip30Wallet.getUnusedAddresses();
    return addresses.map((address) => Address.fromString(address));
  }

  /**
   * Fetches and parses a single change address from the wallet.
   * @returns {Promise<Address>} A promise that resolves to a parsed `Address` object.
   */
  public async getChangeAddress(): Promise<Address> {
    const address = await this.cip30Wallet.getChangeAddress();
    return Address.fromString(address);
  }

  /**
   * Fetches and parses all reward addresses controlled by the wallet.
   * @returns {Promise<RewardAddress[]>} A promise that resolves to an array of parsed `RewardAddress` objects.
   */
  public async getRewardAddresses(): Promise<RewardAddress[]> {
    const addresses = await this.cip30Wallet.getRewardAddresses();
    return addresses.map((addrString) => RewardAddress.fromBech32(addrString));
  }

  /**
   * Requests a transaction signature from the wallet and deserializes the resulting witness set.
   * @param {string} txCbor - The transaction to be signed, provided as a CBOR hex string.
   * @param {boolean} partialSign - If true, the wallet will only add its witness for multi-signature transactions.
   * @returns {Promise<VkeyWitnessSet>} A promise that resolves to the deserialized `VkeyWitnessSet`.
   */
  public async signTransaction(txCbor: string, partialSign: boolean): Promise<VkeyWitnessSet> {
    const witnessSet = await this.cip30Wallet.signTx(txCbor, partialSign);
    return readVkeyWitnessSetFromCbor(witnessSet);
  }

  /**
   * Requests a CIP-8 compliant data signature from the wallet.
   * @param {Address | string} address - The address to sign with (as an `Address` object or Bech32 string).
   * @param {string} payload - The hex-encoded data payload to be signed.
   * @returns {Promise<{ signature: string; key: string }>} A promise that resolves to the signature and public key.
   */
  public async signData(address: Address | string, payload: string): Promise<{ signature: string; key: string }> {
    const addr = typeof address === 'string' ? address : address.toString();
    return this.cip30Wallet.signData(addr, payload);
  }

  /**
   * Submits a fully signed transaction to the blockchain via the wallet's provider.
   * @param {string} txCbor - The fully signed transaction as a CBOR hex string.
   * @returns {Promise<string>} A promise that resolves to the transaction ID (hash).
   */
  public async submitTransaction(txCbor: string): Promise<string> {
    return this.cip30Wallet.submitTx(txCbor);
  }

  /**
   * Fetches and deserializes the wallet's collateral UTxOs.
   * @returns {Promise<TxOut[]>} A promise that resolves to an array of collateral `TxOut` objects.
   * @remarks Collateral is required for transactions involving Plutus smart contracts.
   */
  public async getCollateral(): Promise<UTxO[]> {
    const utxos = await this.cip30Wallet.getCollateral();
    return (utxos ?? []).map((utxo) => readUTxOtFromCbor(utxo));
  }

  /**
   * Creates and initializes a new transaction builder with the wallet's current state.
   *
   * @returns {Promise<TransactionBuilder>} A promise that resolves to a pre-configured `TransactionBuilder` instance.
   * @remarks
   * This method simplifies transaction construction by automatically pre-populating the builder with:
   * 1. The wallet's available UTxOs as inputs.
   * 2. The wallet's change address to receive any leftover funds.
   * 3. The network parameters from the wallet's provider.
   *
   * The returned builder is ready for you to add outputs and other transaction details.
   */
  public async createTransactionBuilder(): Promise<TransactionBuilder> {
    let ownAddress = await this.getUsedAddresses();
    const ownUtxos = await this.getUnspentOutputs();

    if (ownAddress.length === 0) {
      ownAddress = await this.getUnusedAddresses();
    }

    if (!this.protocolParams) {
      this.protocolParams = await this.provider.getParameters();
    }

    return TransactionBuilder.create({ params: this.protocolParams, provider: this.provider })
      .setChangeAddress(ownAddress[0])
      .setCollateralChangeAddress(ownAddress[0])
      .setCollateralUtxos(ownUtxos)
      .setUtxos(ownUtxos);
  }
}
