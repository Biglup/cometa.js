/**
 * Copyright 2024 Biglup Labs.
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

import { Bip32PublicKey } from './Bip32PublicKey';
import { Ed25519PrivateKey } from './Ed25519PrivateKey';
import { assertSuccess, writeStringToMemory } from '../marshaling';
import { finalizationRegistry } from '../garbageCollection';
import { getModule } from '../module';

/* DEFINITIONS ****************************************************************/

/**
 * Represents a BIP32 hierarchical deterministic (HD) private key.
 *
 * The `Bip32PrivateKey` class encapsulates private key operations under the BIP32 standard.
 * BIP32 defines a standard for HD wallets, enabling the derivation of an extensive tree
 * of private keys from a single seed. These private keys can be used to generate public keys,
 * derive addresses, and sign transactions within the Cardano ecosystem.
 */
export class Bip32PrivateKey {
  /**
   * The memory address of the `Bip32PrivateKey` WASM object.
   */
  public ptr: number;

  /**
   * Constructs a new `Bip32PrivateKey` instance.
   *
   * This constructor is private and should not be called directly.
   * Use one of the static factory methods like:
   * - {@link Bip32PrivateKey.fromBytes} to create an instance from raw byte data.
   * - {@link Bip32PrivateKey.fromHex} to create an instance from a hexadecimal string.
   * - {@link Bip32PrivateKey.fromBip39Entropy} to generate a key from BIP39 entropy.
   *
   * @param ptr The memory address of the private key in the WASM context.
   * @private
   */
  private constructor(ptr: number) {
    this.ptr = ptr;

    finalizationRegistry.register(this, {
      freeFunc: getModule().bip32_private_key_unref,
      ptr: this.ptr
    });
  }

  /**
   * Creates a BIP32 private key from BIP39 entropy.
   *
   * This method initializes a BIP32 private key using entropy derived from a BIP39 mnemonic.
   * A password can also be provided to enhance security.
   *
   * @param password The password or passphrase as a `Uint8Array`.
   * @param entropy The entropy derived from a BIP39 mnemonic as a `Uint8Array`.
   * @returns A new `Bip32PrivateKey` instance.
   * @throws {Error} If the operation fails.
   *
   * @example
   * const password = new TextEncoder().encode("my-secure-password");
   * const entropy = new Uint8Array([0x01, 0x02, 0x03, ...]);
   * const privateKey = Bip32PrivateKey.fromBip39Entropy(password, entropy);
   */
  public static fromBip39Entropy(password: Uint8Array, entropy: Uint8Array): Bip32PrivateKey {
    const module = getModule();
    const passwordPtr = module._malloc(password.length);
    const entropyPtr = module._malloc(entropy.length);
    const keyPtrPtr = module._malloc(4);

    try {
      module.HEAPU8.set(password, passwordPtr);
      module.HEAPU8.set(entropy, entropyPtr);

      const result = module.bip32_private_key_from_bip39_entropy(
        passwordPtr,
        password.length,
        entropyPtr,
        entropy.length,
        keyPtrPtr
      );

      assertSuccess(result, 'Failed to create BIP32 private key from BIP39 entropy.');

      const keyPtr = module.getValue(keyPtrPtr, 'i32');
      return new Bip32PrivateKey(keyPtr);
    } finally {
      module.memzero(passwordPtr, 0, password.length);
      module.memzero(entropyPtr, 0, entropy.length);

      module._free(passwordPtr);
      module._free(entropyPtr);
      module._free(keyPtrPtr);
    }
  }

  /**
   * Creates a BIP32 private key from raw bytes.
   *
   * This method allows for constructing a `Bip32PrivateKey` directly from its raw binary representation.
   *
   * @param data The raw byte data of the private key as a `Uint8Array`.
   * @returns A new `Bip32PrivateKey` instance.
   * @throws {Error} If the operation fails.
   *
   * @example
   * const bytes = new Uint8Array([0x01, 0x02, 0x03, ...]);
   * const privateKey = Bip32PrivateKey.fromBytes(bytes);
   */
  public static fromBytes(data: Uint8Array): Bip32PrivateKey {
    const module = getModule();
    const dataPtr = module._malloc(data.length);
    const keyPtrPtr = module._malloc(4);

    try {
      module.HEAPU8.set(data, dataPtr);
      const result = module.bip32_private_key_from_bytes(dataPtr, data.length, keyPtrPtr);

      assertSuccess(result, 'Failed to create BIP32 private key from bytes.');

      const keyPtr = module.getValue(keyPtrPtr, 'i32');
      return new Bip32PrivateKey(keyPtr);
    } finally {
      module._free(dataPtr);
      module._free(keyPtrPtr);
    }
  }

  /**
   * Creates a BIP32 private key from a hexadecimal string.
   *
   * This method initializes a `Bip32PrivateKey` using its hexadecimal representation.
   *
   * @param hex A hexadecimal string representing the private key.
   * @returns A new `Bip32PrivateKey` instance.
   * @throws {Error} If the operation fails.
   *
   * @example
   * const hex = 'abcdef0123456789...';
   * const privateKey = Bip32PrivateKey.fromHex(hex);
   */
  public static fromHex(hex: string): Bip32PrivateKey {
    const module = getModule();
    const keyPtrPtr = module._malloc(4);
    const hexPtr = writeStringToMemory(hex);

    try {
      const result = module.bip32_private_key_from_hex(hexPtr, hex.length, keyPtrPtr);

      assertSuccess(result, 'Failed to create BIP32 private key from hex.');

      const keyPtr = module.getValue(keyPtrPtr, 'i32');
      return new Bip32PrivateKey(keyPtr);
    } finally {
      module._free(hexPtr);
      module._free(keyPtrPtr);
    }
  }

  /**
   * Derives a child BIP32 private key using a specified derivation path.
   *
   * This method computes a child private key by following a derivation path represented by an array of indices.
   * Indices >= 2^31 represent hardened keys, which cannot be derived from public keys.
   *
   * @param indices An array of indices specifying the derivation path.
   * @returns A new `Bip32PrivateKey` instance for the derived key.
   * @throws {Error} If the operation fails.
   *
   * @example
   * const parentKey = Bip32PrivateKey.fromHex('abcdef...');
   * const childKey = parentKey.derive([44, 1815, 0]);
   */
  public derive(indices: number[]): Bip32PrivateKey {
    const module = getModule();

    const indicesArray = new Uint32Array(indices);

    const indicesPtr = module._malloc(indicesArray.length * 4);
    const keyPtrPtr = module._malloc(4);

    try {
      module.HEAPU32.set(indicesArray, indicesPtr / 4);

      const result = module.bip32_private_key_derive(this.ptr, indicesPtr, indicesArray.length, keyPtrPtr);

      assertSuccess(result, 'Failed to derive BIP32 private key.');

      const derivedKeyPtr = module.getValue(keyPtrPtr, 'i32');

      return new Bip32PrivateKey(derivedKeyPtr);
    } finally {
      module._free(indicesPtr);
      module._free(keyPtrPtr);
    }
  }

  /**
   * Derives the public key corresponding to this private key.
   *
   * This method extracts the public key associated with the current private key.
   * The resulting `Bip32PublicKey` can be used for address generation, signature verification,
   * and other operations that do not require private key access.
   *
   * @returns A `Bip32PublicKey` instance corresponding to the derived public key.
   * @throws {Error} If the operation fails.
   *
   * @example
   * const privateKey = Bip32PrivateKey.fromHex('abcdef...');
   * const publicKey = privateKey.getPublicKey();
   * console.log('Derived public key:', publicKey.toHex());
   */
  public getPublicKey(): Bip32PublicKey {
    const module = getModule();
    const keyPtrPtr = module._malloc(4);

    try {
      const result = module.bip32_private_key_get_public_key(this.ptr, keyPtrPtr);
      assertSuccess(result, 'Failed to derive public key from BIP32 private key.');

      const publicKeyPtr = module.getValue(keyPtrPtr, 'i32');
      return new Bip32PublicKey(publicKeyPtr);
    } finally {
      module._free(keyPtrPtr);
    }
  }

  /**
   * Converts the BIP32 private key to its raw byte representation.
   *
   * This method serializes the private key into a `Uint8Array`, which is the raw binary format.
   *
   * @returns A `Uint8Array` containing the raw byte representation of the private key.
   * @throws {Error} If the operation fails.
   *
   * @example
   * const privateKey = Bip32PrivateKey.fromHex('abcdef...');
   * const rawBytes = privateKey.toBytes();
   * console.log('Private key raw bytes:', rawBytes);
   */
  public toBytes(): Uint8Array {
    const module = getModule();
    const size = this.getBytesSize();
    const bufferPtr = module._malloc(size);

    try {
      const result = module.bip32_private_key_to_bytes(this.ptr, bufferPtr, size);

      assertSuccess(result, 'Failed to serialize BIP32 private key to bytes.');

      return new Uint8Array(module.HEAPU8.subarray(bufferPtr, bufferPtr + size));
    } finally {
      module._free(bufferPtr);
    }
  }

  /**
   * Converts the BIP32 private key to a hexadecimal string.
   *
   * This method serializes the private key into a hexadecimal string, providing a human-readable format.
   *
   * @returns A string containing the hexadecimal representation of the private key.
   * @throws {Error} If the operation fails.
   *
   * @example
   * const privateKey = Bip32PrivateKey.fromBytes(new Uint8Array([0x01, 0x02, ...]));
   * const hex = privateKey.toHex();
   * console.log('Private key in hexadecimal:', hex);
   */
  public toHex(): string {
    const module = getModule();
    const size = module.bip32_private_key_get_hex_size(this.ptr);
    const hexPtr = module._malloc(size);

    try {
      const result = module.bip32_private_key_to_hex(this.ptr, hexPtr, size);

      assertSuccess(result, 'Failed to serialize BIP32 private key to hex.');

      return module.UTF8ToString(hexPtr);
    } finally {
      module._free(hexPtr);
    }
  }

  /**
   * Converts the BIP32 private key to an Ed25519 private key.
   *
   * This method transforms the hierarchical deterministic (HD) private key into an Ed25519
   * private key. The resulting key can be used in cryptographic operations such as signing.
   *
   * @returns An instance of `Ed25519PrivateKey`.
   * @throws {Error} If the conversion fails.
   *
   * @example
   * const privateKey = Bip32PrivateKey.fromBytes(new Uint8Array([0x01, 0x02, ...]));
   * const ed25519Key = privateKey.toEd25519();
   * console.log('Derived Ed25519 private key:', ed25519Key.toHex());
   */
  public toEd25519Key(): Ed25519PrivateKey {
    const module = getModule();
    const keyPtrPtr = module._malloc(4);

    try {
      const result = module.bip32_private_key_to_ed25519_key(this.ptr, keyPtrPtr);

      assertSuccess(result, 'Failed to convert BIP32 private key to Ed25519 private key.');

      const ed25519KeyPtr = module.getValue(keyPtrPtr, 'i32');
      return new Ed25519PrivateKey(ed25519KeyPtr);
    } finally {
      module._free(keyPtrPtr);
    }
  }

  /**
   * The reference count retrieved by this method reflects the number of references maintained internally by
   * libcardano-c for this native instance of the object. This is unrelated to the reference counting
   * mechanism in JavaScript, which is managed by the JavaScript engine's garbage collector.
   *
   * This method is primarily intended for diagnostic purposes.
   *
   * @returns {number} The current reference count of the object in the WASM context.
   */
  public refCount(): number {
    const module = getModule();
    return module.bip32_private_key_refcount(this.ptr);
  }

  /**
   * Retrieves the size of the BIP32 private key in bytes.
   *
   * This method determines the number of bytes required to store the serialized representation
   * of the private key.
   *
   * @returns The size of the private key in bytes.
   * @private
   */
  private getBytesSize(): number {
    const module = getModule();
    return module.bip32_private_key_get_bytes_size(this.ptr);
  }
}
