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

import { Ed25519Signature } from './Ed25519Signature';
import { assertSuccess, readBlake2bHashData, writeStringToMemory } from '../marshaling';
import { finalizationRegistry } from '../garbageCollection';
import { getModule } from '../module';
import { uint8ArrayToHex } from '../cometa';

/* DEFINITIONS ****************************************************************/

/**
 * Represents an Ed25519 public key in the Cardano ecosystem.
 * This class provides methods for creating, managing, and performing cryptographic operations
 * with Ed25519 public keys, including signature verification and hashing.
 */
export class Ed25519PublicKey {
  /**
   * Pointer to the native Ed25519 public key object in memory.
   */
  public ptr: number;

  /**
   * Constructs a new `Ed25519PublicKey` instance.
   *
   * This constructor is not meant to be called directly. Use static methods like:
   * - {@link Ed25519PublicKey.fromBytes} to create an instance from raw byte data.
   * - {@link Ed25519PublicKey.fromHex} to create an instance from a hexadecimal string.
   *
   * @param ptr The memory address of the native Ed25519 public key object.
   * @private
   */
  public constructor(ptr: number) {
    this.ptr = ptr;

    finalizationRegistry.register(this, {
      freeFunc: getModule().ed25519_public_key_unref,
      ptr: this.ptr
    });
  }

  /**
   * Creates an Ed25519 public key from raw bytes.
   *
   * @param data The raw byte data of the public key as a `Uint8Array`.
   * @returns A new `Ed25519PublicKey` instance.
   * @throws {Error} If the operation fails due to invalid data or memory issues.
   *
   * @example
   * const publicKeyData = new Uint8Array([0x01, 0x02, 0x03]);
   * const publicKey = Ed25519PublicKey.fromBytes(publicKeyData);
   * console.log(publicKey); // Outputs the Ed25519PublicKey object
   */
  public static fromBytes(data: Uint8Array): Ed25519PublicKey {
    const module = getModule();
    const dataPtr = module._malloc(data.length);
    const keyPtrPtr = module._malloc(4);

    try {
      module.HEAPU8.set(data, dataPtr);
      const result = module.ed25519_public_key_from_bytes(dataPtr, data.length, keyPtrPtr);

      assertSuccess(result, 'Failed to create Ed25519 public key from bytes.');

      const keyPtr = module.getValue(keyPtrPtr, 'i32');
      return new Ed25519PublicKey(keyPtr);
    } finally {
      module._free(dataPtr);
      module._free(keyPtrPtr);
    }
  }

  /**
   * Creates an Ed25519 public key from a hexadecimal string.
   *
   * @param hex A string containing the hexadecimal representation of the public key.
   * @returns A new `Ed25519PublicKey` instance.
   * @throws {Error} If the operation fails due to invalid data or memory issues.
   *
   * @example
   * const publicKeyHex = '010203...';
   * const publicKey = Ed25519PublicKey.fromHex(publicKeyHex);
   * console.log(publicKey); // Outputs the Ed25519PublicKey object
   */
  public static fromHex(hex: string): Ed25519PublicKey {
    const module = getModule();
    const hexPtr = writeStringToMemory(hex);
    const keyPtrPtr = module._malloc(4);

    try {
      const result = module.ed25519_public_key_from_hex(hexPtr, hex.length, keyPtrPtr);

      assertSuccess(result, 'Failed to create Ed25519 public key from hex.');

      const keyPtr = module.getValue(keyPtrPtr, 'i32');
      return new Ed25519PublicKey(keyPtr);
    } finally {
      module._free(hexPtr);
      module._free(keyPtrPtr);
    }
  }

  /**
   * Converts the Ed25519 public key to raw bytes.
   *
   * @returns A `Uint8Array` containing the raw byte representation of the public key.
   * @throws {Error} If the operation fails, such as memory allocation issues.
   *
   * @example
   * const publicKey = Ed25519PublicKey.fromHex('010203...');
   * const publicKeyBytes = publicKey.toBytes();
   * console.log(publicKeyBytes); // Outputs the raw byte data
   */
  public toBytes(): Uint8Array {
    const module = getModule();
    const size = this.getBytesSize();
    const bufferPtr = module._malloc(size);

    try {
      const result = module.ed25519_public_key_to_bytes(this.ptr, bufferPtr, size);

      assertSuccess(result, 'Failed to convert Ed25519 public key to bytes.');

      return new Uint8Array(module.HEAPU8.subarray(bufferPtr, bufferPtr + size));
    } finally {
      module._free(bufferPtr);
    }
  }

  /**
   * Converts the Ed25519 public key to a hexadecimal string.
   *
   * @returns A string containing the hexadecimal representation of the public key.
   * @throws {Error} If the operation fails, such as memory allocation issues.
   *
   * @example
   *
   * const publicKey = Ed25519PublicKey.fromBytes(new Uint8Array([0x01, 0x02, 0x03 ...]));
   * const publicKeyHex = publicKey.toHex();
   * console.log(publicKeyHex); // Outputs the hexadecimal string
   */
  public toHex(): string {
    const module = getModule();
    const size = this.getHexSize();
    const hexPtr = module._malloc(size);

    try {
      const result = module.ed25519_public_key_to_hex(this.ptr, hexPtr, size);

      assertSuccess(result, 'Failed to convert Ed25519 public key to hex.');

      return module.UTF8ToString(hexPtr);
    } finally {
      module._free(hexPtr);
    }
  }

  /**
   * Verifies a signature against a message using this Ed25519 public key.
   *
   * @param signature The `Ed25519Signature` object to verify.
   * @param message The message data that was signed as a `Uint8Array`.
   * @returns `true` if the signature is valid, otherwise `false`.
   *
   * @example
   *
   * const publicKey = Ed25519PublicKey.fromHex('010203...');
   * const signature = Ed25519Signature.fromHex('010203...');
   * const message = new Uint8Array([0x01, 0x02, 0x03]);
   * const isValid = publicKey.verify(signature, message);
   * console.log(isValid); // Outputs true or false
   */
  public verify(signature: Ed25519Signature, message: Uint8Array): boolean {
    const module = getModule();
    const messagePtr = module._malloc(message.length);

    try {
      module.HEAPU8.set(message, messagePtr);
      return module.ed25519_public_verify(this.ptr, signature.ptr, messagePtr, message.length) !== 0;
    } finally {
      module._free(messagePtr);
    }
  }

  /**
   * Computes the BLAKE2b hash of this Ed25519 public key.
   *
   * @returns A `Uint8Array` containing the BLAKE2b hash of the public key.
   * @throws {Error} If the operation fails, such as memory allocation issues.
   *
   * @example
   *
   * const publicKey = Ed25519PublicKey.fromHex('010203...');
   * const hash = publicKey.toHash();
   * console.log(hash); // Outputs the BLAKE2b hash
   */
  public toHash(): Uint8Array {
    const module = getModule();
    const hashPtrPtr = module._malloc(4);

    try {
      const result = module.ed25519_public_key_to_hash(this.ptr, hashPtrPtr);

      assertSuccess(result, 'Failed to compute hash from Ed25519 public key.');

      const hashPtr = module.getValue(hashPtrPtr, 'i32');
      return readBlake2bHashData(hashPtr);
    } finally {
      module._free(hashPtrPtr);
    }
  }

  /**
   * Computes the BLAKE2b hash of this Ed25519 public key and returns it as a hexadecimal string.
   *
   * @returns A string containing the hexadecimal representation of the BLAKE2b hash of the public key.
   * @throws {Error} If the operation fails.
   *
   * @example
   *
   * const publicKey = Ed25519PublicKey.fromHex('010203...');
   * const hashHex = publicKey.toHashHex();
   * console.log(hashHex); // Outputs the BLAKE2b hash as a hexadecimal string
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
    return module.ed25519_public_key_refcount(this.ptr);
  }

  /**
   * Retrieves the size in bytes of the Ed25519PublicKey.
   * @returns The size in bytes.
   * @throws {Error} If the operation fails.
   * @private
   */
  private getBytesSize(): number {
    const module = getModule();
    return module.ed25519_public_key_get_bytes_size(this.ptr);
  }

  /**
   * Retrieves the size of the Ed25519PublicKey in hexadecimal form.
   * @returns The size in hexadecimal representation.
   * @throws {Error} If the operation fails.
   * @private
   */
  private getHexSize(): number {
    const module = getModule();
    return module.ed25519_public_key_get_hex_size(this.ptr);
  }
}
