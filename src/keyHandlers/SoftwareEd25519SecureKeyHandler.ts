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

import { Crc32, Ed25519PrivateKey, Ed25519PublicKey, Emip003 } from '../crypto';
import { Ed25519SecureKeyHandler } from './SecureKeyHandler';
import { VkeyWitness, VkeyWitnessSet } from '../common';
import { getModule } from '../module';
import { readBlake2bHashData, readTransactionFromCbor, unrefObject } from '../marshaling';

/* DEFINITIONS ****************************************************************/

/**
 * A software-based implementation of a secure key handler for single Ed25519 keys.
 *
 * This class securely manages a single private key by encrypting it with a passphrase.
 * The passphrase is provided on-demand via an asynchronous callback, and the decrypted
 * key material only exists in memory for the brief moment it's needed for an operation,
 * after which it is securely wiped.
 */
export class SoftwareEd25519SecureKeyHandler implements Ed25519SecureKeyHandler {
  private static readonly MAGIC = 0x0a0a0a0a;
  private static readonly VERSION = 0x01;
  private static readonly ED25519_KEY_HANDLER = 0x00;

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
   * A private helper method to securely get the decrypted key material on demand.
   * It immediately wipes the provided passphrase after use.
   */
  private async getDecryptedKey(): Promise<Uint8Array> {
    const passphrase = await this.getPassphrase();
    try {
      return Emip003.decrypt(this.encryptedData, passphrase);
    } finally {
      passphrase.fill(0);
    }
  }

  /**
   * Creates a new Ed25519-based key handler from a raw private key and a passphrase.
   *
   * @param {Ed25519PrivateKey} privateKey - The raw Ed25519 private key.
   * @param {Uint8Array} passphrase - The passphrase to initially encrypt the key.
   * @param {() => Promise<Uint8Array>} getPassphrase - An async function called when the passphrase is needed for cryptographic operations.
   * @returns {Promise<Ed25519SecureKeyHandler>} A new instance of the key handler.
   * @warning For security, this function will zero out the `passphrase` Uint8Array buffer after it is used. Do not reuse it.
   */
  public static async fromEd25519Key(
    privateKey: Ed25519PrivateKey,
    passphrase: Uint8Array,
    getPassphrase: () => Promise<Uint8Array>
  ): Promise<Ed25519SecureKeyHandler> {
    const privateKeyBytes = privateKey.toBytes();
    try {
      const encryptedKey = Emip003.encrypt(privateKeyBytes, passphrase);
      return new SoftwareEd25519SecureKeyHandler(encryptedKey, getPassphrase);
    } finally {
      privateKeyBytes.fill(0);
      passphrase.fill(0);
    }
  }

  /**
   * Deserializes an encrypted Ed25519 key handler from a byte array.
   *
   * The binary format is:
   * `[ 4-byte magic | 1-byte version | 1-byte type | 4-byte data_len | data | 4-byte crc32 checksum ]`
   *
   * @param {Uint8Array} data - The serialized and encrypted key data.
   * @param {() => Promise<Uint8Array>} getPassphrase - An async function called when the passphrase is needed.
   * @returns {Ed25519SecureKeyHandler} A new instance of the key handler.
   */
  public static deserialize(data: Uint8Array, getPassphrase: () => Promise<Uint8Array>): Ed25519SecureKeyHandler {
    const minLength = 14;
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
    if (typeNum !== this.ED25519_KEY_HANDLER) {
      throw new Error(`Unsupported key type: ${typeNum}. Expected ${this.ED25519_KEY_HANDLER}.`);
    }

    const encryptedDataSize = view.getUint32(6, false);
    if (data.length !== minLength + encryptedDataSize) {
      throw new Error('Invalid serialized data: length mismatch.');
    }
    const encryptedData = data.subarray(10, 10 + encryptedDataSize);

    return new SoftwareEd25519SecureKeyHandler(encryptedData, getPassphrase);
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
    const footerSize = 4;
    const dataSize = this.encryptedData.length;
    const totalSize = headerSize + dataSize + footerSize;

    const buffer = new Uint8Array(totalSize);
    const view = new DataView(buffer.buffer);

    view.setUint32(0, SoftwareEd25519SecureKeyHandler.MAGIC, false);
    view.setUint8(4, SoftwareEd25519SecureKeyHandler.VERSION);
    view.setUint8(5, SoftwareEd25519SecureKeyHandler.ED25519_KEY_HANDLER);
    view.setUint32(6, dataSize, false);

    buffer.set(this.encryptedData, headerSize);

    const dataToChecksum = buffer.subarray(0, headerSize + dataSize);
    const checksum = Crc32.compute(dataToChecksum);
    view.setUint32(headerSize + dataSize, checksum, false);

    return buffer;
  }

  /**
   * Signs a transaction using the securely stored Ed25519 private key.
   *
   * @param {string} txCbor - The transaction to sign, as a CBOR-encoded hex string.
   * @returns {Promise<VkeyWitnessSet>} A promise that resolves with the `VkeyWitnessSet` containing the signature.
   * @note During this operation, the private key is temporarily decrypted in memory and then securely wiped immediately after use.
   */
  public async signTransaction(txCbor: string): Promise<VkeyWitnessSet> {
    const txPtr = readTransactionFromCbor(txCbor);
    const txBodyHashPtr = getModule().transaction_get_id(txPtr);
    const txBodyHash = readBlake2bHashData(txBodyHashPtr, true);
    unrefObject(txPtr);

    const decryptedKey = await this.getDecryptedKey();

    try {
      const privateKey = Ed25519PrivateKey.fromExtendedBytes(decryptedKey);
      const publicKey = privateKey.getPublicKey();
      const signature = privateKey.sign(txBodyHash);

      const witness: VkeyWitness = {
        signature: signature.toHex(),
        vkey: publicKey.toHex()
      };

      return [witness];
    } finally {
      decryptedKey.fill(0);
    }
  }

  /**
   * Retrieves the public key corresponding to the securely stored private key.
   *
   * @returns {Promise<Ed25519PublicKey>} A promise that resolves with the corresponding `Ed25519PublicKey`.
   * @note This operation requires the private key, which is temporarily decrypted in memory and then securely wiped immediately after use.
   */
  public async getPublicKey(): Promise<Ed25519PublicKey> {
    const decryptedKey = await this.getDecryptedKey();

    try {
      const privateKey = Ed25519PrivateKey.fromExtendedBytes(decryptedKey);
      return privateKey.getPublicKey();
    } finally {
      decryptedKey.fill(0);
    }
  }
}
