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

/* IMPORTS *******************************************************************/

import { Bip32PublicKey, Ed25519PublicKey } from '../crypto';
import { VkeyWitnessSet } from '../common';

/* DEFINITIONS ****************************************************************/

/**
 * Harden a BIP-32 child number.
 * @param num - The child number to harden.
 * @return The hardened child number.
 */
export const harden = (num: number): number => 0x80_00_00_00 + num;

/**
 * Defines the coin type for Cardano in BIP-44/BIP-1852 derivation paths.
 */
export enum CoinType {
  Cardano = 1815
}

/**
 * Defines the purpose for a BIP-1852 derivation path.
 */
export enum KeyDerivationPurpose {
  Standard = 1852,
  Multisig = 1854
}

/**
 * Defines the role for a BIP-1852 derivation path, specifying the key's usage.
 */
export enum KeyDerivationRole {
  External = 0,
  Internal = 1,
  Staking = 2,
  DRep = 3,
  CommitteeCold = 4,
  CommitteeHot = 5
}

/**
 * Represents a BIP-1852 derivation path for an account.
 * m / purpose' / 1815' / account'
 */
export type AccountDerivationPath = {
  purpose: number;
  coinType: number;
  account: number;
};

/**
 * Represents a full BIP-1852 derivation path for a specific key.
 * m / purpose' / 1815' / account' / role / index
 */
export type DerivationPath = AccountDerivationPath & {
  role: KeyDerivationRole;
  index: number;
};

/**
 * Defines the contract for a secure key handler that manages a BIP32 hierarchical deterministic (HD) root key.
 *
 * Implementations of this interface are responsible for keeping the root private key secure.
 * The key should only be decrypted for the brief duration of a cryptographic operation in the case of in-memory implementations,
 * after which thy must be securely wiped from memory to minimize exposure.
 */
export interface Bip32SecureKeyHandler {
  /**
   * Signs a transaction using BIP32-derived keys.
   *
   * @param {string} txCbor - The CBOR-encoded transaction hex string to be signed.
   * @param {DerivationPath[]} derivationPaths - An array of derivation paths specifying which keys are required to sign the transaction.
   * @returns {Promise<VkeyWitnessSet>} A promise that resolves with the `VkeyWitnessSet` containing the generated signatures.
   * @note During this operation, the root private key is temporarily decrypted in memory and securely wiped immediately after use.
   */
  signTransaction(txCbor: string, derivationPaths: DerivationPath[]): Promise<VkeyWitnessSet>;

  /**
   * Derives and returns an extended account public key from the root key.
   *
   * @param {AccountDerivationPath} path - The derivation path for the account (purpose and account index).
   * @returns {Promise<Bip32PublicKey>} A promise that resolves with the derived extended account public key.
   * @note This operation requires the root private key, which is temporarily decrypted in memory and securely wiped immediately after use.
   */
  getAccountPublicKey(path: AccountDerivationPath): Promise<Bip32PublicKey>;

  /**
   * Serializes the encrypted root key and its configuration for secure storage.
   * This allows the handler's state to be saved and later restored via a deserialize function.
   *
   * @returns {Promise<Uint8Array>} A promise that resolves with the encrypted and serialized key handler data.
   */
  serialize(): Promise<Uint8Array>;
}

/**
 * Defines the contract for a secure key handler that manages a single, non-derivable Ed25519 private key.
 *
 * Implementations of this interface are responsible for keeping the private key secure.
 * The key should only be decrypted for the brief duration of a cryptographic operation in the case of in-memory implementations,
 * after which thy must be securely wiped from memory to minimize exposure.
 */
export interface Ed25519SecureKeyHandler {
  /**
   * Signs a transaction using the securely stored Ed25519 private key.
   *
   * @param {string} transaction - The CBOR-encoded transaction hex string to be signed.
   * @returns {Promise<VkeyWitnessSet>} A promise that resolves with the `VkeyWitnessSet` containing the signature.
   */
  signTransaction(transaction: string): Promise<VkeyWitnessSet>;

  /**
   * Retrieves the public key corresponding to the securely stored private key.
   *
   * @returns {Promise<Ed25519PublicKey>} A promise that resolves with the corresponding `Ed25519PublicKey`.
   */
  getPublicKey(): Promise<Ed25519PublicKey>;

  /**
   * Serializes the encrypted key data for secure storage.
   * This allows the handler's state to be saved and later restored.
   *
   * @returns {Promise<Uint8Array>} A promise that resolves with the encrypted and serialized key data.
   */
  serialize(): Promise<Uint8Array>;
}

/**
 * Represents any type of secure key handler.
 */
export type SecureKeyHandler = Bip32SecureKeyHandler | Ed25519SecureKeyHandler;
