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

import { AccountDerivationPath, Bip32SecureKeyHandler, DerivationPath } from './SecureKeyHandler';
import { Bip32PrivateKey, Bip32PublicKey, Crc32, Ed25519PrivateKey, Emip003 } from '../crypto';
import { VkeyWitness, VkeyWitnessSet } from '../common';
import { getModule } from '../module';
import { hexToUint8Array } from '../cometa';
import { readBlake2bHashData, readTransactionFromCbor, unrefObject } from '../marshaling';

/* DEFINITIONS ****************************************************************/

/**
 * A software-based implementation of a secure key handler for BIP32 hierarchical deterministic keys.
 *
 * This class securely manages a root key by encrypting it with a passphrase.
 * The passphrase is provided on-demand via an asynchronous callback, and the decrypted
 * key material only exists in memory for the brief moment it's needed for an operation,
 * after which it is securely wiped.
 */
export class SoftwareBip32SecureKeyHandler implements Bip32SecureKeyHandler {
  private static readonly MAGIC = 0x0a0a0a0a;
  private static readonly VERSION = 0x01;
  private static readonly BIP32_KEY_HANDLER = 0x01;
  private readonly encryptedData: Uint8Array;
  private readonly getPassphrase: () => Promise<Uint8Array>;

  /**
   * This constructor is private. Use the static factory methods to create an instance.
   * @private
   */
  private constructor(encryptedData: Uint8Array, getPassphrase: () => Promise<Uint8Array>) {
    this.encryptedData = encryptedData;
    this.getPassphrase = getPassphrase;
  }

  /**
   * A private helper method to securely get the decrypted seed on demand.
   * It immediately wipes the provided passphrase after use.
   */
  private async getDecryptedSeed(): Promise<Uint8Array> {
    const passphrase = await this.getPassphrase();
    try {
      return Emip003.decrypt(this.encryptedData, passphrase);
    } finally {
      passphrase.fill(0);
    }
  }

  /**
   * Creates a new BIP32-based key handler from entropy and a passphrase.
   *
   * @param {Uint8Array} entropy - The entropy bytes for the root key.
   * @param {Uint8Array} passphrase - The passphrase to initially encrypt the key.
   * @param {() => Promise<Uint8Array>} getPassphrase - An async function that will be called whenever the passphrase is needed for cryptographic operations.
   * @returns {Promise<Bip32SecureKeyHandler>} A new instance of the key handler.
   * @warning For security, this function will zero out the `entropy` and `passphrase` Uint8Array buffers after they are used. Do not reuse them.
   */
  public static fromEntropy(
    entropy: Uint8Array,
    passphrase: Uint8Array,
    getPassphrase: () => Promise<Uint8Array>
  ): Bip32SecureKeyHandler {
    try {
      const encryptedEntropy = Emip003.encrypt(entropy, passphrase);
      return new SoftwareBip32SecureKeyHandler(encryptedEntropy, getPassphrase);
    } finally {
      entropy.fill(0);
      passphrase.fill(0);
    }
  }

  /**
   * Deserializes an encrypted key handler from a byte array.
   *
   * The binary format is:
   * `[ 4-byte magic | 1-byte version | 1-byte type | 4-byte data_len | data | 4-byte crc32 checksum ]`
   *
   * @param {Uint8Array} data - The serialized and encrypted key data.
   * @param {() => Promise<Uint8Array>} getPassphrase - An async function called when the passphrase is needed.
   * @returns {Bip32SecureKeyHandler} A new instance of the key handler.
   */
  public static deserialize(data: Uint8Array, getPassphrase: () => Promise<Uint8Array>): Bip32SecureKeyHandler {
    const minLength = 14; // 4 magic + 1 version + 1 type + 4 len + 4 checksum
    if (data.length < minLength) {
      throw new Error('Invalid serialized data: too short.');
    }

    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

    const dataToVerify = data.subarray(0, data.length - 4);
    const receivedChecksum = view.getUint32(data.length - 4, false);
    const calculatedChecksum = Crc32.compute(dataToVerify);

    if (receivedChecksum !== calculatedChecksum) {
      throw new Error('Invalid serialized data: checksum mismatch.');
    }

    const magic = view.getUint32(0, false);
    if (magic !== this.MAGIC) {
      throw new Error('Invalid serialized data: incorrect magic number.');
    }

    const version = view.getUint8(4);
    if (version !== this.VERSION) {
      throw new Error(`Unsupported version: ${version}. Expected ${this.VERSION}.`);
    }

    const typeNum = view.getUint8(5);
    if (typeNum !== this.BIP32_KEY_HANDLER) {
      throw new Error(`Unsupported key type: ${typeNum}. Expected ${this.BIP32_KEY_HANDLER}.`);
    }

    const encryptedDataSize = view.getUint32(6, false);
    if (data.length !== minLength + encryptedDataSize) {
      throw new Error('Invalid serialized data: length mismatch.');
    }
    const encryptedData = data.subarray(10, 10 + encryptedDataSize);

    return new SoftwareBip32SecureKeyHandler(encryptedData, getPassphrase);
  }

  /**
   * Serializes the encrypted key data for secure storage into a binary format.
   *
   * The binary format is:
   * `[ 4-byte magic | 1-byte version | 1-byte type | 4-byte data_len | data | 4-byte crc32 checksum ]`
   *
   * @returns {Promise<Uint8Array>} A promise that resolves with the serialized and encrypted key data.
   */
  public async serialize(): Promise<Uint8Array> {
    const headerSize = 10;
    const dataSize = this.encryptedData.length;

    const partToChecksum = new Uint8Array(headerSize + dataSize);
    const view = new DataView(partToChecksum.buffer);

    view.setUint32(0, SoftwareBip32SecureKeyHandler.MAGIC, false);
    view.setUint8(4, SoftwareBip32SecureKeyHandler.VERSION);
    view.setUint8(5, SoftwareBip32SecureKeyHandler.BIP32_KEY_HANDLER);
    view.setUint32(6, dataSize, false);

    partToChecksum.set(this.encryptedData, headerSize);

    const checksum = Crc32.compute(partToChecksum);

    const finalBuffer = new Uint8Array(partToChecksum.length + 4);
    const finalView = new DataView(finalBuffer.buffer);

    finalBuffer.set(partToChecksum, 0);
    finalView.setUint32(partToChecksum.length, checksum, false);

    return finalBuffer;
  }

  /**
   * Signs a transaction using BIP32-derived keys.
   *
   * @param {string} txCbor - The transaction to sign, as a CBOR-encoded hex string.
   * @param {DerivationPath[]} derivationPaths - The paths to the keys needed for signing.
   * @returns {Promise<VkeyWitnessSet>} A promise that resolves with the set of witnesses containing the signatures.
   * @note During this operation, the root key is temporarily decrypted in memory and then securely wiped immediately after use.
   */
  public async signTransaction(txCbor: string, derivationPaths: DerivationPath[]): Promise<VkeyWitnessSet> {
    const txPtr = readTransactionFromCbor(txCbor);
    const txBodyHashPtr = getModule().transaction_get_id(txPtr);
    const txBodyHash = readBlake2bHashData(txBodyHashPtr, true);
    unrefObject(txPtr);

    const witnesses: VkeyWitness[] = [];

    if (!derivationPaths || derivationPaths.length === 0) {
      throw new Error('Derivation paths are required for signing with a BIP32 key handler.');
    }
    const entropy = await this.getDecryptedSeed();

    try {
      const rootKey = Bip32PrivateKey.fromBip39Entropy(new Uint8Array(), entropy);

      for (const path of derivationPaths) {
        const pathIndices = [path.purpose, path.coinType, path.account, path.role, path.index];
        const signingKey = rootKey.derive(pathIndices);
        const publicKey = signingKey.getPublicKey();
        const signature = signingKey.toEd25519Key().sign(txBodyHash);

        witnesses.push({
          signature: signature.toHex(),
          vkey: publicKey.toEd25519Key().toHex()
        });
      }
    } finally {
      entropy.fill(0);
    }

    return witnesses;
  }

  /**
   * Signs arbitrary data using a BIP32-derived key.
   * @param data - The hex-encoded data to be signed.
   * @param path - The derivation path specifying which key to use for signing.
   *
   * @returns {Promise<{ signature: string; key: string }>} A promise that resolves with an object containing the signature and the public key.
   */
  public async signData(data: string, path: DerivationPath): Promise<{ signature: string; key: string }> {
    const entropy = await this.getDecryptedSeed();

    try {
      const rootKey = Bip32PrivateKey.fromBip39Entropy(new Uint8Array(), entropy);

      const pathIndices = [path.purpose, path.coinType, path.account, path.role, path.index];
      const signingKey = rootKey.derive(pathIndices);
      const publicKey = signingKey.getPublicKey();
      const signature = signingKey.toEd25519Key().sign(hexToUint8Array(data));

      return {
        key: publicKey.toEd25519Key().toHex(),
        signature: signature.toHex()
      };
    } finally {
      entropy.fill(0);
    }
  }

  /**
   * Retrieves the securely stored private key.
   *
   * @param derivationPath - The derivation path specifying which key to retrieve.
   *
   * @warning This operation exposes the private key in memory and should be used with extreme caution.
   * The caller is responsible for securely handling and wiping the key from memory after use.
   *
   * @returns {Promise<Ed25519PrivateKey>} A promise that resolves with the private key.
   */
  public async getPrivateKey(derivationPath: DerivationPath): Promise<Ed25519PrivateKey> {
    const entropy = await this.getDecryptedSeed();

    try {
      const rootKey = Bip32PrivateKey.fromBip39Entropy(new Uint8Array(), entropy);

      const pathIndices = [
        derivationPath.purpose,
        derivationPath.coinType,
        derivationPath.account,
        derivationPath.role,
        derivationPath.index
      ];
      const signingKey = rootKey.derive(pathIndices);

      return signingKey.toEd25519Key();
    } finally {
      entropy.fill(0);
    }
  }

  /**
   * Derives and returns an extended account public key.
   *
   * @param {AccountDerivationPath} path - The derivation path for the account.
   * @returns {Promise<Bip32PublicKey>} A promise that resolves with the extended account public key.
   * @note This operation requires the root key, which is temporarily decrypted in memory and then securely wiped immediately after use.
   */
  public async getAccountPublicKey(path: AccountDerivationPath): Promise<Bip32PublicKey> {
    const entropy = await this.getDecryptedSeed();
    try {
      const rootKey = Bip32PrivateKey.fromBip39Entropy(new Uint8Array(), entropy);
      const accountKey = rootKey.derive([path.purpose, path.coinType, path.account]);
      return accountKey.getPublicKey();
    } finally {
      entropy.fill(0);
    }
  }
}
