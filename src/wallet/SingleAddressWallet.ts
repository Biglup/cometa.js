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

import { Address, BaseAddress, CredentialType, EnterpriseAddress, NetworkId, RewardAddress } from '../address';
import { Bip32PrivateKey, Bip32PublicKey } from '../crypto';
import {
  Bip32SecureKeyHandler,
  CoinType,
  KeyDerivationPurpose,
  KeyDerivationRole,
  SoftwareBip32SecureKeyHandler,
  harden
} from '../keyHandlers';
import { NetworkMagic, UTxO, Value, VkeyWitnessSet } from '../common';
import { Provider } from '../provider';
import { Wallet } from './Wallet';
import { mnemonicToEntropy } from '../bip39';

/* DEFINITIONS ****************************************************************/

/**
 * Defines part of the BIP-44 derivation path components for a single Cardano address.
 * @property {number} account - The account index.
 * @property {number} paymentIndex - The address index for the payment key (role 0).
 * @property {number} [stakingIndex] - The address index for the staking key (role 2). If provided, a **Base address** (payment + staking) will be derived. If omitted, an **Enterprise address** (payment only) will be derived.
 */
export type SingleAddressCredentialsConfig = {
  account: number;
  paymentIndex: number;
  stakingIndex?: number;
};

/**
 * Configuration for creating a `SingleAddressWallet` instance from pre-existing key objects.
 * @property {Bip32SecureKeyHandler} secureKeyHandler - The handler that manages encrypted private keys.
 * @property {Bip32PublicKey} accountRootPublicKey - The public key for the specified account from which addresses are derived.
 * @property {Provider} provider - The provider instance for interacting with the Cardano blockchain.
 * @property {SingleAddressCredentialsConfig} credentialsConfig - Specifies the derivation path for the address this wallet will manage.
 */
export type SingleAddressWalletConfig = {
  secureKeyHandler: Bip32SecureKeyHandler;
  accountRootPublicKey: Bip32PublicKey;
  provider: Provider;
  credentialsConfig: SingleAddressCredentialsConfig;
};

/**
 * Configuration for creating a `SingleAddressWallet` instance from a mnemonic phrase.
 * @property {string[]} mnemonics - The mnemonic (seed) phrase used to derive the root key.
 * @property {Provider} provider - The provider instance for interacting with the Cardano blockchain.
 * @property {SingleAddressCredentialsConfig} credentialsConfig - Specifies the derivation path for the address this wallet will manage.
 * @property {() => Promise<Uint8Array>} getPassword - An async callback function that securely provides the password for encrypting the derived keys.
 */
export type SingleAddressWalletFromMnemonicsConfig = {
  mnemonics: string[];
  provider: Provider;
  credentialsConfig: SingleAddressCredentialsConfig;
  getPassword: () => Promise<Uint8Array>;
};

/**
 * Coalesces the values from an array of UTxOs into a single, consolidated Value object.
 *
 * This function iterates through a list of Unspent Transaction Outputs and sums up all
 * the lovelace (coins) and native assets from their respective TxOuts into a
 * single, cumulative Value.
 *
 * @param {UTxO[]} utxos - An array of UTxOs to be coalesced.
 * @returns {Value} A single Value object representing the total sum of all coins and assets.
 */
const coalesceUtxoValues = (utxos: UTxO[]): Value =>
  utxos.reduce<Value>(
    (accumulator, utxo) => {
      const { value } = utxo.output;
      accumulator.coins += value.coins;
      if (value.assets) {
        if (!accumulator.assets) {
          accumulator.assets = {};
        }
        for (const [assetId, amount] of Object.entries(value.assets)) {
          accumulator.assets[assetId] = (accumulator.assets[assetId] || 0n) + amount;
        }
      }
      return accumulator;
    },
    { coins: 0n }
  );

/**
 * A simple, single-address wallet implementation for programmatic use.
 *
 * @class SingleAddressWallet
 * @implements {Wallet}
 * @remarks
 * This class provides a straightforward wallet interface that manages a single
 * payment and staking key pair derived from a specific path. It is not a
 * full Hierarchical Deterministic (HD) wallet and does not perform address
 * discovery. Its simplicity makes it ideal for testing, scripting, or backend
 * applications where interaction with a single, known address is required.
 */
export class SingleAddressWallet implements Wallet {
  private secureKeyHandler: Bip32SecureKeyHandler;
  private provider: Provider;
  private credentialsConfig: SingleAddressCredentialsConfig;
  private accountRootPublicKey: Bip32PublicKey;
  private paymentAddress: Address | undefined;
  private rewardAddress: RewardAddress | undefined;

  /**
   * Constructs a new instance of the SingleAddressWallet.
   * @param {SingleAddressWalletConfig} config - The configuration object for the wallet.
   * @remarks This constructor is private. Use the static `createFromMnemonics` method to create an instance.
   */
  public constructor({
    secureKeyHandler,
    provider,
    credentialsConfig,
    accountRootPublicKey
  }: SingleAddressWalletConfig) {
    this.secureKeyHandler = secureKeyHandler;
    this.provider = provider;
    this.credentialsConfig = credentialsConfig;
    this.accountRootPublicKey = accountRootPublicKey;
  }

  /**
   * Creates a new wallet instance from a mnemonic phrase.
   *
   * This factory method is the primary way to instantiate a wallet from a user's
   * seed phrase, handling the necessary key derivation and encryption.
   *
   * @param {SingleAddressWalletFromMnemonicsConfig} config - The configuration options for creating the wallet.
   * @returns {Promise<SingleAddressWallet>} A promise that resolves to the newly created wallet instance.
   */
  public static async createFromMnemonics({
    mnemonics,
    provider,
    credentialsConfig,
    getPassword
  }: SingleAddressWalletFromMnemonicsConfig) {
    const entropy = mnemonicToEntropy(mnemonics);
    const password = await getPassword();
    const rootKey = Bip32PrivateKey.fromBip39Entropy(new Uint8Array(), entropy);
    const accountKey = rootKey.derive([
      harden(KeyDerivationPurpose.Standard),
      harden(CoinType.Cardano),
      harden(credentialsConfig.account)
    ]);
    const accountRootPublicKey = accountKey.getPublicKey();

    try {
      return new SingleAddressWallet({
        accountRootPublicKey,
        credentialsConfig,
        provider,
        secureKeyHandler: SoftwareBip32SecureKeyHandler.fromEntropy(entropy, password, getPassword)
      });
    } finally {
      entropy.fill(0);
      password.fill(0);
    }
  }

  /**
   * Returns the wallet's current network ID.
   * @returns {Promise<NetworkId>} A promise that resolves to the network ID (0 for Testnet, 1 for Mainnet).
   */
  public async getNetworkId(): Promise<NetworkId> {
    const magic = this.provider.getNetworkMagic();
    return magic === NetworkMagic.Mainnet ? NetworkId.Mainnet : NetworkId.Testnet;
  }

  /**
   * Fetches all Unspent Transaction Outputs (UTxOs) for the wallet's address.
   * @returns {Promise<UTxO[]>} A promise that resolves to an array of the wallet's UTxOs.
   */
  public async getUnspentOutputs(): Promise<UTxO[]> {
    const address = await this.getAddress();
    return this.provider.getUnspentOutputs(address.toString());
  }

  /**
   * Fetches and deserializes the total balance of all assets controlled by the wallet.
   * @returns {Promise<Value>} A promise that resolves to a `Value` object representing the wallet's complete balance.
   */
  public async getBalance(): Promise<Value> {
    const address = await this.getAddress();
    const utxos = await this.provider.getUnspentOutputs(address.toString());
    return coalesceUtxoValues(utxos);
  }

  /**
   * Fetches and parses all used addresses controlled by the wallet.
   * @returns {Promise<Address[]>} A promise that resolves to an array of parsed `Address` objects.
   */
  public async getUsedAddresses(): Promise<Address[]> {
    const address = await this.getAddress();
    return [address];
  }

  /**
   * Fetches and parses all unused addresses controlled by the wallet.
   * @returns {Promise<Address[]>} A promise that resolves to an array of parsed `Address` objects.
   */
  public async getUnusedAddresses(): Promise<Address[]> {
    return [];
  }

  /**
   * Fetches and parses a single change address from the wallet.
   * @returns {Promise<Address>} A promise that resolves to a parsed `Address` object.
   */
  public async getChangeAddress(): Promise<Address> {
    return await this.getAddress();
  }

  /**
   * Fetches and parses all reward addresses controlled by the wallet.
   * @returns {Promise<RewardAddress[]>} A promise that resolves to an array of parsed `RewardAddress` objects.
   */
  public async getRewardAddresses(): Promise<RewardAddress[]> {
    const rewardAddress = await this.getRewardAddress();
    return [rewardAddress];
  }

  /**
   * Requests a signature for a transaction using the wallet's keys.
   * @param {string} txCbor - The transaction to be signed, provided as a CBOR hex string.
   * @param {boolean} partialSign - A flag to control which credentials are used for signing.
   * @returns {Promise<VkeyWitnessSet>} A promise that resolves to the deserialized `VkeyWitnessSet`.
   * @remarks
   * For this type of wallet, we are going to hijack this flag and break the interface contract:
   * - When `partialSign` is `true`, the transaction is signed **only** with the payment credential.
   * - When `partialSign` is `false`, the transaction is signed with **both** the payment and staking credentials.
   */
  public async signTransaction(txCbor: string, partialSign: boolean): Promise<VkeyWitnessSet> {
    const derivationPaths = [
      {
        account: harden(this.credentialsConfig.account),
        coinType: harden(CoinType.Cardano),
        index: this.credentialsConfig.paymentIndex,
        purpose: harden(KeyDerivationPurpose.Standard),
        role: KeyDerivationRole.External
      }
    ];

    if (!partialSign) {
      derivationPaths.push({
        account: harden(this.credentialsConfig.account),
        coinType: harden(CoinType.Cardano),
        index: this.credentialsConfig.paymentIndex,
        purpose: harden(KeyDerivationPurpose.Standard),
        role: KeyDerivationRole.Staking
      });
    }

    return await this.secureKeyHandler.signTransaction(txCbor, derivationPaths);
  }

  /**
   * Requests a CIP-8 compliant data signature from the wallet.
   * @param {Address | string} _address - The address to sign with (as an `Address` object or Bech32 string).
   * @param {string} _payload - The hex-encoded data payload to be signed.
   * @returns {Promise<{ signature: string; key: string }>} A promise that resolves to the signature and public key.
   */
  public async signData(_address: Address | string, _payload: string): Promise<{ signature: string; key: string }> {
    throw new Error('SingleAddressWallet: signData is not implemented.');
  }

  /**
   * Submits a fully signed transaction to the blockchain via the wallet's provider.
   * @param {string} txCbor - The fully signed transaction as a CBOR hex string.
   * @returns {Promise<string>} A promise that resolves to the transaction ID (hash).
   */
  public async submitTransaction(txCbor: string): Promise<string> {
    return this.provider.submitTransaction(txCbor);
  }

  /**
   * Fetches and deserializes the wallet's collateral UTxOs.
   * @returns {Promise<TxOut[]>} A promise that resolves to an array of collateral `TxOut` objects.
   * @remarks Collateral is required for transactions involving Plutus smart contracts.
   */
  public async getCollateral(): Promise<UTxO[]> {
    return [];
  }

  /**
   * Derives the payment address based on the wallet's configuration.
   * @returns {Promise<Address>} A promise resolving to a BaseAddress (with staking) or an EnterpriseAddress (without staking).
   */
  private async getAddress(): Promise<Address> {
    if (this.paymentAddress) {
      return this.paymentAddress;
    }

    const paymentKey = this.accountRootPublicKey.derive([
      KeyDerivationRole.External,
      this.credentialsConfig.paymentIndex
    ]);
    const paymentCredential = {
      hash: paymentKey.toEd25519Key().toHashHex(),
      type: CredentialType.KeyHash
    };

    const network = await this.getNetworkId();

    if (typeof this.credentialsConfig.stakingIndex === 'number') {
      const stakingKey = this.accountRootPublicKey.derive([
        KeyDerivationRole.Staking,
        this.credentialsConfig.stakingIndex
      ]);
      this.paymentAddress = BaseAddress.fromCredentials(network, paymentCredential, {
        hash: stakingKey.toEd25519Key().toHashHex(),
        type: CredentialType.KeyHash
      }).toAddress();
      return this.paymentAddress;
    }

    this.paymentAddress = EnterpriseAddress.fromCredentials(network, paymentCredential).toAddress();
    return this.paymentAddress;
  }

  /**
   * Derives the rewards address based on the wallet's configuration.
   * @returns {Promise<Address>} A promise resolving to a Rewards.
   */
  private async getRewardAddress(): Promise<RewardAddress> {
    if (this.rewardAddress) {
      return this.rewardAddress;
    }
    const network = await this.getNetworkId();

    if (typeof this.credentialsConfig.stakingIndex !== 'number') {
      throw new TypeError('SingleAddressWallet: Staking index was not provided.');
    }

    const stakingKey = this.accountRootPublicKey.derive([
      KeyDerivationRole.Staking,
      this.credentialsConfig.stakingIndex
    ]);

    this.rewardAddress = RewardAddress.fromCredentials(network, {
      hash: stakingKey.toEd25519Key().toHashHex(),
      type: CredentialType.KeyHash
    });

    return this.rewardAddress;
  }
}
