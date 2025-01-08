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

import { Ed25519PublicKey } from './Ed25519PublicKey';
import { assertSuccess, readBlake2bHashData, writeStringToMemory } from '../marshaling';
import { finalizationRegistry } from '../garbageCollection';
import { getModule } from '../module';
import { uint8ArrayToHex } from '../cometa';

/* DEFINITIONS ****************************************************************/

/**
 * The `Bip32PublicKey` class encapsulates a public key following the BIP32 standard, which is a
 * specification for hierarchical deterministic (HD) wallets. In HD wallets, a single
 * master seed can derive an entire tree-like structure of cryptographic keys. Public keys in this
 * structure are used for generating wallet addresses and verifying transactions without exposing
 * private keys.
 */
export class Bip32PublicKey {
  /**
   * The memory address of the `Bip32PublicKey` WASM object.
   */
  public ptr: number;

  /**
   * Constructs a new `Bip32PublicKey` instance.
   *
   * This constructor is not meant to be called directly. Instead, use static methods like:
   * - {@link Bip32PublicKey.fromBytes}: Creates an instance from a raw byte array.
   * - {@link Bip32PublicKey.fromHex}: Creates an instance from a hexadecimal string.
   * - {@link Bip32PublicKey.derive}: Derives a child public key from a derivation path.
   *
   * @param ptr The memory address of the public key WASM object.
   * @private
   */
  public constructor(ptr: number) {
    this.ptr = ptr;

    finalizationRegistry.register(this, {
      freeFunc: getModule().bip32_public_key_unref,
      ptr: this.ptr
    });
  }

  /**
   * Creates a `Bip32PublicKey` instance from raw bytes.
   *
   * This method allows the construction of a `Bip32PublicKey` using its raw binary representation.
   *
   * @param data The raw byte data of the BIP32 public key.
   *
   * @returns A new `Bip32PublicKey` instance that encapsulates the provided raw bytes.
   *
   * @throws {Error} If the operation fails.
   *
   * @example
   * const rawBytes = new Uint8Array([0x01, 0x02, 0x03, ...]); // Raw public key bytes
   * try {
   *   const publicKey = Bip32PublicKey.fromBytes(rawBytes);
   *   console.log('Public key created successfully:', publicKey);
   * } catch (error) {
   *   console.error('Failed to create Bip32PublicKey:', error);
   * }
   */
  public static fromBytes(data: Uint8Array): Bip32PublicKey {
    const module = getModule();
    const dataPtr = module._malloc(data.length);
    const keyPtrPtr = module._malloc(4);

    try {
      module.HEAPU8.set(data, dataPtr);
      const result = module.bip32_public_key_from_bytes(dataPtr, data.length, keyPtrPtr);

      assertSuccess(result, 'Failed to create BIP32 public key from bytes.');

      const keyPtr = module.getValue(keyPtrPtr, 'i32');
      return new Bip32PublicKey(keyPtr);
    } finally {
      module._free(dataPtr);
      module._free(keyPtrPtr);
    }
  }

  /**
   * Creates a `Bip32PublicKey` instance from a hexadecimal string.
   *
   * This method allows the construction of a `Bip32PublicKey` using its hexadecimal representation.
   *
   * @param hex The hexadecimal string representing the BIP32 public key.
   *
   * @returns A new `Bip32PublicKey` instance that encapsulates the provided hexadecimal data.
   *
   * @throws {Error} If the operation fails.
   *
   * @example
   * const hexString = 'abcdef0123456789...'; // Hexadecimal public key string
   * try {
   *   const publicKey = Bip32PublicKey.fromHex(hexString);
   *   console.log('Public key created successfully:', publicKey);
   * } catch (error) {
   *   console.error('Failed to create Bip32PublicKey:', error);
   * }
   */
  public static fromHex(hex: string): Bip32PublicKey {
    const module = getModule();
    const hexPtr = writeStringToMemory(hex);
    const keyPtrPtr = module._malloc(4);

    try {
      const result = module.bip32_public_key_from_hex(hexPtr, hex.length, keyPtrPtr);

      assertSuccess(result, 'Failed to create BIP32 public key from hex.');

      const keyPtr = module.getValue(keyPtrPtr, 'i32');
      return new Bip32PublicKey(keyPtr);
    } finally {
      module._free(hexPtr);
      module._free(keyPtrPtr);
    }
  }

  /**
   * Converts the `Bip32PublicKey` to its raw byte representation.
   *
   * This method serializes the `Bip32PublicKey` into a `Uint8Array`.
   *
   * @returns A `Uint8Array` containing the raw byte representation of the `Bip32PublicKey`.
   *
   * @throws {Error} If the operation fails.
   *
   * @example
   * try {
   *   const publicKey = Bip32PublicKey.fromHex('abcdef0123456789...');
   *   const bytes = publicKey.toBytes();
   *   console.log('Raw byte representation:', bytes);
   * } catch (error) {
   *   console.error('Failed to convert Bip32PublicKey to bytes:', error);
   * }
   */
  public toBytes(): Uint8Array {
    const module = getModule();
    const size = this.getBytesSize();
    const bufferPtr = module._malloc(size);

    try {
      const result = module.bip32_public_key_to_bytes(this.ptr, bufferPtr, size);

      assertSuccess(result, 'Failed to convert BIP32 public key to bytes.');

      return new Uint8Array(module.HEAPU8.subarray(bufferPtr, bufferPtr + size));
    } finally {
      module._free(bufferPtr);
    }
  }

  /**
   * Converts the `Bip32PublicKey` to a hexadecimal string representation.
   *
   * This method serializes the `Bip32PublicKey` into a hexadecimal string,
   * providing a human-readable representation.
   *
   * @returns A string containing the hexadecimal representation of the `Bip32PublicKey`.
   *
   * @throws {Error} If the operation fails.
   *
   * @example
   * try {
   *   const publicKey = Bip32PublicKey.fromBytes(new Uint8Array([0x01, 0x02, 0x03, 0x04]));
   *   const hex = publicKey.toHex();
   *   console.log('Hexadecimal representation:', hex);
   * } catch (error) {
   *   console.error('Failed to convert Bip32PublicKey to hex:', error);
   * }
   */
  public toHex(): string {
    const module = getModule();
    const size = this.getHexSize();
    const hexPtr = module._malloc(size);

    try {
      const result = module.bip32_public_key_to_hex(this.ptr, hexPtr, size);

      assertSuccess(result, 'Failed to convert BIP32 public key to hex.');

      return module.UTF8ToString(hexPtr);
    } finally {
      module._free(hexPtr);
    }
  }

  /**
   * Derives a new `Bip32PublicKey` based on the given derivation path.
   *
   * This method computes a child BIP32 public key by following a derivation path specified
   * as an array of indices. The indices represent the hierarchical levels in the BIP32 standard,
   * where each level derives a unique child key from its parent.
   *
   * Hardened keys cannot be derived directly from public keys, as the private key is required
   * for hardened derivations. Indices in the range `[0, 2^31 - 1]` represent non-hardened keys
   * and are valid for public key derivation.
   *
   * @param indices An array of numbers representing the derivation path.
   *                - Each number corresponds to an index in the hierarchy.
   *                - Only non-hardened indices (less than `2^31`) are supported for public keys.
   *
   * @returns A derived `Bip32PublicKey` instance corresponding to the specified derivation path.
   *          - The returned key is independent of the original key and can be used for cryptographic operations.
   *
   * @throws {Error} If the operation fails.
   *
   * @example
   * try {
   *   const rootKey = Bip32PublicKey.fromBytes(new Uint8Array([0x01, 0x02, 0x03, 0x04]));
   *   const indices = [44, 1815, 0];
   *   const childKey = rootKey.derive(indices);
   *   console.log('Derived child public key:', childKey.toHex());
   * } catch (error) {
   *   console.error('Failed to derive Bip32PublicKey:', error);
   * }
   */
  public derive(indices: number[]): Bip32PublicKey {
    const module = getModule();
    const indicesPtr = module._malloc(indices.length * 4);
    const derivedKeyPtrPtr = module._malloc(4);

    try {
      module.HEAPU32.set(indices, indicesPtr / 4);

      const result = module.bip32_public_key_derive(this.ptr, indicesPtr, indices.length, derivedKeyPtrPtr);

      assertSuccess(result, 'Failed to derive BIP32 public key.');

      const derivedKeyPtr = module.getValue(derivedKeyPtrPtr, 'i32');
      return new Bip32PublicKey(derivedKeyPtr);
    } finally {
      module._free(indicesPtr);
      module._free(derivedKeyPtrPtr);
    }
  }

  /**
   * Converts the `Bip32PublicKey` to an `Ed25519PublicKey`.
   *
   * This method extracts the Ed25519 public key from the BIP32 hierarchical deterministic
   * (HD) public key format. The Ed25519 public key is used for cryptographic operations
   * such as verifying digital signatures and signing data.
   *
   * @returns An `Ed25519PublicKey` instance representing the extracted public key.
   *
   * @throws {Error} If the operation fails.
   *
   * @example
   * try {
   *   const bip32Key = Bip32PublicKey.fromBytes(new Uint8Array([0x01, 0x02, 0x03, 0x04]));
   *   const ed25519Key = bip32Key.toEd25519Key();
   *   console.log('Extracted Ed25519 public key:', ed25519Key.toHex());
   * } catch (error) {
   *   console.error('Failed to convert Bip32PublicKey to Ed25519PublicKey:', error);
   * }
   */
  public toEd25519Key(): Ed25519PublicKey {
    const module = getModule();
    const keyPtrPtr = module._malloc(4);

    try {
      const result = module.bip32_public_key_to_ed25519_key(this.ptr, keyPtrPtr);

      assertSuccess(result, 'Failed to convert BIP32 public key to Ed25519 key.');

      const keyPtr = module.getValue(keyPtrPtr, 'i32');
      return new Ed25519PublicKey(keyPtr);
    } finally {
      module._free(keyPtrPtr);
    }
  }

  /**
   * Converts the `Bip32PublicKey` to a cryptographic hash using the BLAKE2b hashing algorithm.
   *
   * This method computes a BLAKE2b hash of the BIP32 public key.
   *
   * @returns A `Uint8Array` containing the BLAKE2b hash of the BIP32 public key.
   *          - The length of the hash depends on the BLAKE2b configuration in the underlying implementation.
   *
   * @throws {Error} error if the operation fails.
   *
   * @example
   * try {
   *   const bip32Key = Bip32PublicKey.fromBytes(new Uint8Array([0x01, 0x02, 0x03, 0x04]));
   *   const hash = bip32Key.toHash();
   *   console.log('BLAKE2b hash of the Bip32PublicKey:', Buffer.from(hash).toString('hex'));
   * } catch (error) {
   *   console.error('Failed to compute the hash of Bip32PublicKey:', error);
   * }
   */
  public toHash(): Uint8Array {
    const module = getModule();
    const hashPtrPtr = module._malloc(4);

    try {
      const result = module.bip32_public_key_to_hash(this.ptr, hashPtrPtr);

      assertSuccess(result, 'Failed to hash BIP32 public key.');

      const hashPtr = module.getValue(hashPtrPtr, 'i32');
      return readBlake2bHashData(hashPtr);
    } finally {
      module._free(hashPtrPtr);
    }
  }

  /**
   * Converts the `Bip32PublicKey` to a hexadecimal string representing its cryptographic hash.
   *
   * This method first computes the BLAKE2b hash of the `Bip32PublicKey` and then converts
   * the resulting hash from its binary form (`Uint8Array`) to a hexadecimal string.
   *
   * @returns A string containing the hexadecimal representation of the BLAKE2b hash of the `Bip32PublicKey`.
   *
   * @throws {Error} If the operation fails.
   *
   * @example
   * try {
   *   const bip32Key = Bip32PublicKey.fromBytes(new Uint8Array([0x01, 0x02, 0x03, 0x04]));
   *   const hashHex = bip32Key.toHashHex();
   *   console.log('Hexadecimal hash of the Bip32PublicKey:', hashHex);
   * } catch (error) {
   *   console.error('Failed to compute the hash in hexadecimal format:', error);
   * }
   */
  public toHashHex(): string {
    return uint8ArrayToHex(this.toHash());
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
    return module.bip32_public_key_refcount(this.ptr);
  }

  /**
   * Retrieves the size in bytes of the Bip32PublicKey.
   * @returns The size in bytes.
   * @throws {Error} If the operation fails.
   * @private
   */
  private getBytesSize(): number {
    const module = getModule();
    return module.bip32_public_key_get_bytes_size(this.ptr);
  }

  /**
   * Retrieves the size of the Bip32PublicKey in hexadecimal form.
   * @returns The size in hexadecimal representation.
   * @throws {Error} If the operation fails.
   * @private
   */
  private getHexSize(): number {
    const module = getModule();
    return module.bip32_public_key_get_hex_size(this.ptr);
  }
}
