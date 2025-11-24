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

import {
  Address,
  AddressType,
  BaseAddress,
  CredentialType,
  EnterpriseAddress,
  NetworkId,
  RewardAddress
} from '../address';
import { Bip32PrivateKey, Bip32PublicKey, Ed25519PublicKey } from '../crypto';
import {
  Bip32SecureKeyHandler,
  CoinType,
  KeyDerivationPurpose,
  KeyDerivationRole,
  SoftwareBip32SecureKeyHandler,
  harden
} from '../keyHandlers';
import { Cip8 } from '../messageSigning';
import { NetworkMagic, ProtocolParameters, UTxO, Value, VkeyWitnessSet } from '../common';
import { Provider } from '../provider';
import { TransactionBuilder } from '../txBuilder';
import { Wallet } from './Wallet';
import { getUniqueSigners } from '../marshaling';
import { hexToUint8Array, uint8ArrayToHex } from '../cometa';
import { mnemonicToEntropy } from '../bip39';

/* DEFINITIONS ****************************************************************/

/**
 * Defines part of the BIP-44 derivation path components for a single Cardano address.
 * @property {number} account - The account index.
 * @property {number} paymentIndex - The address index for the payment key (role 0).
 * @property {number} [stakingIndex] - The address index for the staking key (role 2). If provided, a **Base address** (payment + staking) will be derived. If omitted, an **Enterprise address** (payment only) will be derived.
 * @property {number} [drepIndex] - The address index for the DRep key (role 3). If not provided, 0 will be assumed.
 */
export type SingleAddressCredentialsConfig = {
  account: number;
  paymentIndex: number;
  stakingIndex?: number;
  drepIndex?: number;
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
  private drepPubKey: Ed25519PublicKey | undefined;
  private protocolParams: ProtocolParameters | undefined;

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
   * @remarks This method is currently not supported and always returns an empty array.
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
   * @param {boolean} _partialSign - A flag to control which credentials are used for signing.
   * @returns {Promise<VkeyWitnessSet>} A promise that resolves to the deserialized `VkeyWitnessSet`.
   */
  public async signTransaction(txCbor: string, _partialSign: boolean): Promise<VkeyWitnessSet> {
    const uniqueSigners = getUniqueSigners(txCbor, []);
    let rewardKeyHash;

    if (!this.drepPubKey) {
      // If we don't have a DRep key yet, we need to derive it.
      await this.getPubDRepKey();
    }
    const drepKeyHash = this.drepPubKey?.toHashHex();

    if (typeof this.credentialsConfig.stakingIndex === 'number') {
      const rewardAddress = await this.getRewardAddress();
      rewardKeyHash = rewardAddress.getCredential().hash;
    }

    const hashOurRewardAccountKey = uniqueSigners.includes(rewardKeyHash ?? '');
    const hashOurDRepKey = uniqueSigners.includes(drepKeyHash ?? '');

    // TODO: We are currently not resolving tx inputs to search for our payment key
    // so for now we will assume we always need to sign with the payment credential,
    // in the future we will resolve inputs to more accurately determine the required signers.
    const derivationPaths = [
      {
        account: harden(this.credentialsConfig.account),
        coinType: harden(CoinType.Cardano),
        index: this.credentialsConfig.paymentIndex,
        purpose: harden(KeyDerivationPurpose.Standard),
        role: KeyDerivationRole.External
      }
    ];

    if (typeof this.credentialsConfig.stakingIndex === 'number' && hashOurRewardAccountKey) {
      derivationPaths.push({
        account: harden(this.credentialsConfig.account),
        coinType: harden(CoinType.Cardano),
        index: this.credentialsConfig.stakingIndex,
        purpose: harden(KeyDerivationPurpose.Standard),
        role: KeyDerivationRole.Staking
      });
    }

    if (hashOurDRepKey) {
      derivationPaths.push({
        account: harden(this.credentialsConfig.account),
        coinType: harden(CoinType.Cardano),
        index: this.credentialsConfig.drepIndex ?? 0,
        purpose: harden(KeyDerivationPurpose.Standard),
        role: KeyDerivationRole.DRep
      });
    }

    return await this.secureKeyHandler.signTransaction(txCbor, derivationPaths);
  }

  /**
   * Requests a CIP-8 compliant data signature from the wallet.
   * @param {Address | string} address - The address to sign with (as an `Address` object or Bech32 string).
   * @param {string} payload - The hex-encoded data payload to be signed.
   * @returns {Promise<{ signature: string; key: string }>} A promise that resolves to the signature and public key.
   */
  public async signData(address: Address | string, payload: string): Promise<{ signature: string; key: string }> {
    const signWith = typeof address === 'string' ? Address.fromString(address) : address;
    const message = hexToUint8Array(payload);

    if (signWith.getType() === AddressType.RewardKey) {
      return this.signWithRewardKey(signWith, message);
    }

    if (signWith.getType() === AddressType.EnterpriseKey) {
      const result = await this.signWithDRepKey(signWith, message);
      if (result) {
        return result;
      }
    }

    return this.signWithPaymentKey(signWith, message);
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
   * @remarks This method is currently not supported and always returns an empty array.
   */
  public async getCollateral(): Promise<UTxO[]> {
    return [];
  }

  /**
   * Returns the "network magic," a unique number identifying the Cardano network.
   * @returns {Promise<number>} A promise that resolves to the network magic number (e.g., Mainnet: `764824073`, Preprod: `1`).
   */
  public async getNetworkMagic(): Promise<NetworkMagic> {
    return this.provider.getNetworkMagic();
  }

  /**
   * Returns the wallet's active public DRep (Delegated Representative) key.
   * @returns {Promise<string>} A promise that resolves to the hex-encoded public DRep key.
   */
  public async getPubDRepKey(): Promise<string> {
    if (this.drepPubKey) {
      return this.drepPubKey.toHex();
    }

    const bip32PublicKey = this.accountRootPublicKey.derive([
      KeyDerivationRole.DRep,
      this.credentialsConfig.drepIndex ?? 0
    ]);

    this.drepPubKey = bip32PublicKey.toEd25519Key();

    return this.drepPubKey.toHex();
  }

  /**
   * Returns public stake keys from the wallet that are currently registered for on-chain governance voting.
   * @returns {Promise<string[]>} A promise that resolves to an array of hex-encoded public stake keys.
   * @remarks This method is currently not supported and always returns an empty array.
   */
  public async getRegisteredPubStakeKeys(): Promise<string[]> {
    return [];
  }

  /**
   * Returns public stake keys from the wallet that are NOT yet registered for on-chain governance voting.
   * @returns {Promise<string[]>} A promise that resolves to an array of hex-encoded public stake keys.
   * @remarks This method is currently not supported and always returns an empty array.
   */
  public async getUnregisteredPubStakeKeys(): Promise<string[]> {
    return [];
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
    const ownAddress = await this.getAddress();
    const ownUtxos = await this.getUnspentOutputs();

    if (!this.protocolParams) {
      this.protocolParams = await this.provider.getParameters();
    }
    return TransactionBuilder.create({ params: this.protocolParams, provider: this.provider })
      .setChangeAddress(ownAddress)
      .setCollateralChangeAddress(ownAddress)
      .setCollateralUtxos(ownUtxos)
      .setUtxos(ownUtxos);
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

  /**
   * Helper to sign data using the STAKING key associated with a Reward Address.
   */
  private async signWithRewardKey(signWith: Address, message: Uint8Array): Promise<{ signature: string; key: string }> {
    if (typeof this.credentialsConfig.stakingIndex !== 'number') {
      throw new TypeError('SingleAddressWallet: Staking index was not provided.');
    }

    const walletRewardAddress = await this.getRewardAddress();

    if (walletRewardAddress.toBech32() !== signWith.toString()) {
      throw new Error('SingleAddressWallet: The provided reward address does not belong to this wallet.');
    }

    const privateKey = await this.secureKeyHandler.getPrivateKey({
      account: harden(this.credentialsConfig.account),
      coinType: harden(CoinType.Cardano),
      index: this.credentialsConfig.stakingIndex,
      purpose: harden(KeyDerivationPurpose.Standard),
      role: KeyDerivationRole.Staking
    });

    const { coseKey, coseSign1 } = Cip8.sign(message, signWith, privateKey);

    return {
      key: uint8ArrayToHex(coseKey),
      signature: uint8ArrayToHex(coseSign1)
    };
  }

  /**
   * Helper to sign data using the DREP key associated with an Enterprise Address.
   */
  private async signWithDRepKey(
    signWith: Address,
    message: Uint8Array
  ): Promise<{ signature: string; key: string } | undefined> {
    const cred = signWith.asEnterprise()?.getCredential();

    if (!cred) {
      return undefined;
    }

    if (!this.drepPubKey) {
      await this.getPubDRepKey();
    }

    if (cred.hash === this.drepPubKey?.toHashHex()) {
      const privateKey = await this.secureKeyHandler.getPrivateKey({
        account: harden(this.credentialsConfig.account),
        coinType: harden(CoinType.Cardano),
        index: this.credentialsConfig.drepIndex ?? 0,
        purpose: harden(KeyDerivationPurpose.Standard),
        role: KeyDerivationRole.DRep
      });

      const { coseKey, coseSign1 } = Cip8.signEx(message, hexToUint8Array(cred.hash), privateKey);

      return {
        key: uint8ArrayToHex(coseKey),
        signature: uint8ArrayToHex(coseSign1)
      };
    }
  }

  /**
   * Helper to sign data using the PAYMENT key associated with Base or Enterprise Address.
   */
  private async signWithPaymentKey(
    signWith: Address,
    message: Uint8Array
  ): Promise<{ signature: string; key: string }> {
    const paymentAddress = await this.getAddress();

    const walletPaymentCred =
      paymentAddress.getType() === AddressType.EnterpriseKey
        ? paymentAddress.asEnterprise()?.getCredential()
        : paymentAddress.asBase()?.getPaymentCredential();

    const signWithPaymentCred =
      signWith.getType() === AddressType.EnterpriseKey
        ? signWith.asEnterprise()?.getCredential()
        : signWith.asBase()?.getPaymentCredential();

    if (walletPaymentCred && signWithPaymentCred && walletPaymentCred.hash === signWithPaymentCred.hash) {
      const privateKey = await this.secureKeyHandler.getPrivateKey({
        account: harden(this.credentialsConfig.account),
        coinType: harden(CoinType.Cardano),
        index: this.credentialsConfig.paymentIndex,
        purpose: harden(KeyDerivationPurpose.Standard),
        role: KeyDerivationRole.External
      });

      const { coseKey, coseSign1 } = Cip8.sign(message, signWith, privateKey);

      return {
        key: uint8ArrayToHex(coseKey),
        signature: uint8ArrayToHex(coseSign1)
      };
    }

    throw new Error('SingleAddressWallet: The provided address does not belong to this wallet.');
  }
}
