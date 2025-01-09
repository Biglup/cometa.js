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
import { Ed25519Signature } from './Ed25519Signature';
import { assertSuccess, writeStringToMemory } from '../marshaling';
import { finalizationRegistry } from '../garbageCollection';
import { getModule } from '../module';

/* DEFINITIONS ****************************************************************/

/**
 * Class representing an Ed25519 private key.
 *
 * An Ed25519 private key is a cryptographic key used in the Ed25519 signature scheme, which
 * is a highly efficient elliptic-curve signature system. It provides secure and fast
 * cryptographic operations, ensuring the integrity and authenticity of data.
 *
 * The Ed25519 private key is a component in public-key cryptography, where it is
 * primarily used for signing data. The private key generates a digital signature that can
 * be verified using the corresponding Ed25519 public key. The signature confirms the origin
 * of the data and ensures that it has not been tampered with.
 */
export class Ed25519PrivateKey {
  /**
   * Pointer to the native Ed25519 private key object in the WebAssembly (WASM) memory.
   */
  ptr: number;

  /**
   * Constructs a new `Ed25519PrivateKey` instance.
   *
   * This constructor is not meant to be called directly. Instead, create instances
   * using factory methods provided by the class, such as:
   * - {@link Ed25519PrivateKey.fromBytes}
   * - {@link Ed25519PrivateKey.fromHex}
   *
   * The constructor registers the private key instance with a `FinalizationRegistry`
   * to ensure that the native memory is freed automatically when the object is no longer in use.
   *
   * @param ptr The memory address of the native Ed25519 private key object.
   * @private
   */
  public constructor(ptr: number) {
    this.ptr = ptr;

    finalizationRegistry.register(this, {
      freeFunc: getModule().ed25519_private_key_unref,
      ptr: this.ptr
    });
  }

  /**
   * Creates an Ed25519 private key from a byte array.
   *
   * This function is used to create an Ed25519 private key from a "normal" representation of the
   * private key in byte form, as opposed to the "extended" version. The normal version of the key
   * consists of 32 bytes representing the secret scalar directly, as defined by the Ed25519
   * specification.
   *
   * The normal version is used in cryptographic applications where only the core private
   * key (the scalar) is required for signing operations. It does not include additional metadata
   * or derived values that might be present in extended representations.
   *
   * @param data The byte array representing the private key.
   *             - Must be exactly 32 bytes in length to conform to the Ed25519 normal key format.
   *
   * @returns An instance of Ed25519PrivateKey.
   *
   * @throws {Error} If the operation fails, such as if the provided data is not valid.
   *
   * @example
   *
   * const privateKeyData = new Uint8Array([0x01, 0x02, 0x03, ...]);
   * const privateKey  = Ed25519PrivateKey.fromNormalBytes(privateKeyData);
   * // Can now use the privateKey object
   */
  public static fromNormalBytes(data: Uint8Array): Ed25519PrivateKey {
    const module = getModule();
    const dataPtr = module._malloc(data.length);
    const keyPtrPtr = module._malloc(4);

    try {
      module.HEAPU8.set(data, dataPtr);
      const result = module.ed25519_private_key_from_normal_bytes(dataPtr, data.length, keyPtrPtr);

      assertSuccess(result, 'Failed to create Ed25519 private key from normal bytes.');

      const keyPtr = module.getValue(keyPtrPtr, 'i32');
      return new Ed25519PrivateKey(keyPtr);
    } finally {
      module._free(dataPtr);
      module._free(keyPtrPtr);
    }
  }

  /**
   * Creates an Ed25519 private key from a byte array.
   *
   * This function is used to create an Ed25519 private key from an "extended" representation of
   * the private key. The extended version includes both the secret scalar (32 bytes) and additional
   * precomputed components (32 bytes), resulting in a total of 64 bytes.
   *
   * @param data The extended byte array (64 bytes) representing the private key.
   *             - Must be exactly 64 bytes in length to conform to the Ed25519 extended key format.
   *
   * @returns An instance of Ed25519PrivateKey.
   *
   * @throws {Error} If the operation fails, such as if the provided data is not valid.
   *
   * @example
   *
   * const privateKeyData = new Uint8Array([0x01, 0x02, 0x03, ...]); // 64 bytes
   * const privateKey = Ed25519PrivateKey.fromExtendedBytes(privateKeyData);
   * console.log(privateKey);
   */
  public static fromExtendedBytes(data: Uint8Array): Ed25519PrivateKey {
    const module = getModule();
    const dataPtr = module._malloc(data.length);
    const keyPtrPtr = module._malloc(4);

    try {
      module.HEAPU8.set(data, dataPtr);
      const result = module.ed25519_private_key_from_extended_bytes(dataPtr, data.length, keyPtrPtr);

      assertSuccess(result, 'Failed to create Ed25519 private key from extended bytes.');

      const keyPtr = module.getValue(keyPtrPtr, 'i32');
      return new Ed25519PrivateKey(keyPtr);
    } finally {
      module._free(dataPtr);
      module._free(keyPtrPtr);
    }
  }

  /**
   * Creates an Ed25519 private key from a hexadecimal string.
   *
   * This method is used to create an Ed25519 private key from its "normal" representation encoded
   * as a hexadecimal string. The normal version consists of the 32-byte scalar value that serves as
   * the private key, encoded in a human-readable hex format.
   *
   * @param hex A string representing the hexadecimal encoding of the normal Ed25519 private key.
   *            - Must be a valid hexadecimal string of exactly 64 characters (representing 32 bytes).
   *
   * @returns An instance of Ed25519PrivateKey.
   *
   * @throws {Error} If the operation fails, such as if the provided string is invalid or improperly formatted.
   *
   * @example
   *
   * const privateKeyHex = "abcdef0123456789..."; // 64-character hex string
   * const privateKey = Ed25519PrivateKey.fromNormalHex(privateKeyHex);
   * console.log(privateKey);
   */
  public static fromNormalHex(hex: string): Ed25519PrivateKey {
    const module = getModule();
    const hexPtr = writeStringToMemory(hex);
    const keyPtrPtr = module._malloc(4);

    try {
      const result = module.ed25519_private_key_from_normal_hex(hexPtr, hex.length, keyPtrPtr);

      assertSuccess(result, 'Failed to create Ed25519 private key from hex.');

      const keyPtr = module.getValue(keyPtrPtr, 'i32');
      return new Ed25519PrivateKey(keyPtr);
    } finally {
      module._free(hexPtr);
      module._free(keyPtrPtr);
    }
  }

  /**
   * Creates an Ed25519 private key from a hexadecimal string.
   *
   * This method is used to create an Ed25519 private key from its "extended" representation encoded
   * as a hexadecimal string. The extended version includes both the 32-byte scalar (private key)
   * and 32 bytes of precomputed data, encoded as a 128-character hex string.
   *
   * @param hex A string representing the hexadecimal encoding of the extended Ed25519 private key.
   *            - Must be a valid hexadecimal string of exactly 128 characters (representing 64 bytes).
   *
   * @returns An instance of Ed25519PrivateKey.
   *
   * @throws {Error} If the operation fails, such as if the provided string is invalid or improperly formatted.
   *
   * @example
   *
   * const extendedPrivateKeyHex = "abcdef0123456789..."; // 128-character hex string
   * const privateKey = Ed25519PrivateKey.fromExtendedHex(extendedPrivateKeyHex);
   * console.log(privateKey);
   */
  public static fromExtendedHex(hex: string): Ed25519PrivateKey {
    const module = getModule();
    const hexPtr = writeStringToMemory(hex);
    const keyPtrPtr = module._malloc(4);

    try {
      const result = module.ed25519_private_key_from_extended_hex(hexPtr, hex.length, keyPtrPtr);

      assertSuccess(result, 'Failed to create Ed25519 private key from hex.');

      const keyPtr = module.getValue(keyPtrPtr, 'i32');
      return new Ed25519PrivateKey(keyPtr);
    } finally {
      module._free(hexPtr);
      module._free(keyPtrPtr);
    }
  }

  /**
   * Converts the Ed25519 private key to its raw byte array representation.
   *
   * @returns A Uint8Array containing the private key bytes.
   * @throws {Error} If the operation fails.
   *
   * @example
   *
   * const privateKeyData = privateKey.toBytes();
   * console.log(privateKeyData); // Outputs the private key bytes
   */
  public toBytes(): Uint8Array {
    const module = getModule();
    const size = this.getBytesSize();
    const bufferPtr = module._malloc(size);

    try {
      const result = module.ed25519_private_key_to_bytes(this.ptr, bufferPtr, size);

      assertSuccess(result, 'Failed to convert Ed25519 private key to bytes.');

      return new Uint8Array(module.HEAPU8.subarray(bufferPtr, bufferPtr + size));
    } finally {
      module._free(bufferPtr);
    }
  }

  /**
   * Converts the Ed25519 private key to its hexadecimal string representation.
   *
   * @returns A string containing the hexadecimal representation of the private key.
   * @throws {Error} If the operation fails.
   *
   * @example
   *
   * const privateKeyHex = privateKey.toHex();
   * console.log(privateKeyHex); // Outputs the private key as a hexadecimal string
   */
  public toHex(): string {
    const module = getModule();
    const size = this.getHexSize();
    const hexPtr = module._malloc(size);

    try {
      const result = module.ed25519_private_key_to_hex(this.ptr, hexPtr, size);

      assertSuccess(result, 'Failed to convert Ed25519 private key to hex.');

      return module.UTF8ToString(hexPtr);
    } finally {
      module._free(hexPtr);
    }
  }

  /**
   * Signs a message using the private key.
   *
   * @param message The message to sign as a byte array.
   * @returns An Ed25519Signature instance representing the message signature.
   * @throws {Error} If signing fails.
   *
   * @example
   *
   * const message = new Uint8Array([0x01, 0x02, 0x03]);
   * const signature = privateKey.sign(message);
   * console.log('Signature as hex:', signature.toHex());
   */
  public sign(message: Uint8Array): Ed25519Signature {
    const module = getModule();
    const messagePtr = module._malloc(message.length);
    const signaturePtrPtr = module._malloc(4);

    try {
      module.HEAPU8.set(message, messagePtr);
      const result = module.ed25519_private_key_sign(this.ptr, messagePtr, message.length, signaturePtrPtr);

      assertSuccess(result, 'Failed to sign message with Ed25519 private key.');

      const signaturePtr = module.getValue(signaturePtrPtr, 'i32');
      return new Ed25519Signature(signaturePtr);
    } finally {
      module._free(messagePtr);
      module._free(signaturePtrPtr);
    }
  }

  /**
   * Derives the public key corresponding to this private key.
   *
   * @returns An Ed25519PublicKey instance.
   * @throws {Error} If the operation fails.
   *
   * @example
   *
   * const publicKey = privateKey.getPublicKey();
   * console.log('Public key:', publicKey.toHex());
   */
  public getPublicKey(): Ed25519PublicKey {
    const module = getModule();
    const publicKeyPtrPtr = module._malloc(4);

    try {
      const result = module.ed25519_private_key_get_public_key(this.ptr, publicKeyPtrPtr);

      assertSuccess(result, 'Failed to derive public key from Ed25519 private key.');

      const publicKeyPtr = module.getValue(publicKeyPtrPtr, 'i32');
      return new Ed25519PublicKey(publicKeyPtr);
    } finally {
      module._free(publicKeyPtrPtr);
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
    return module.ed25519_private_key_refcount(this.ptr);
  }

  /**
   * Retrieves the size of the private key in bytes.
   * @returns The size of the private key in bytes.
   * @private
   */
  private getBytesSize(): number {
    const module = getModule();
    return module.ed25519_private_key_get_bytes_size(this.ptr);
  }

  /**
   * Retrieves the size of the private key in hexadecimal representation.
   *
   * @returns The size of the private key in hexadecimal representation.
   * @private
   */
  private getHexSize(): number {
    const module = getModule();
    return module.ed25519_private_key_get_hex_size(this.ptr);
  }
}
