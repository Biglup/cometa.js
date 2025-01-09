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

import { assertSuccess, writeStringToMemory } from '../marshaling';
import { finalizationRegistry } from '../garbageCollection';
import { getModule } from '../module';

/* DEFINITIONS ****************************************************************/

/**
 * Class representing an Ed25519 signature.
 *
 * This class provides methods for creating, converting, and managing Ed25519 signature objects.
 */
export class Ed25519Signature {
  /**
   * Pointer to the native Ed25519 signature object.
   */
  public ptr: number;

  /**
   * Constructs a new `Ed25519Signature` instance.
   *
   * This constructor is used internally and should not be called directly.
   * Use static methods like {@link Ed25519Signature.fromBytes} or
   * {@link Ed25519Signature.fromHex} to create an instance.
   *
   * @param ptr The memory address of the signature in the native context.
   * @private
   */
  public constructor(ptr: number) {
    this.ptr = ptr;

    finalizationRegistry.register(this, {
      freeFunc: getModule().ed25519_signature_unref,
      ptr: this.ptr
    });
  }

  /**
   * Creates an Ed25519 signature from raw byte data.
   *
   * This method allows constructing an Ed25519 signature using its raw binary
   * representation.
   *
   * @param data The raw byte data of the signature as a `Uint8Array`.
   * @returns A new instance of `Ed25519Signature`.
   * @throws {Error} If the operation fails, such as due to invalid byte data
   *                 or memory allocation issues.
   *
   * @example
   * const rawBytes = new Uint8Array([0x01, 0x02, 0x03, ...]);
   * try {
   *   const signature = Ed25519Signature.fromBytes(rawBytes);
   *   console.log('Signature created successfully:', signature);
   * } catch (error) {
   *   console.error('Failed to create Ed25519 signature from bytes:', error);
   * }
   */
  public static fromBytes(data: Uint8Array): Ed25519Signature {
    const module = getModule();
    const dataPtr = module._malloc(data.length);
    const signaturePtrPtr = module._malloc(4);

    try {
      module.HEAPU8.set(data, dataPtr);
      const result = module.ed25519_signature_from_bytes(dataPtr, data.length, signaturePtrPtr);

      assertSuccess(result, 'Failed to create Ed25519 signature from bytes.');

      const signaturePtr = module.getValue(signaturePtrPtr, 'i32');
      return new Ed25519Signature(signaturePtr);
    } finally {
      module._free(dataPtr);
      module._free(signaturePtrPtr);
    }
  }

  /**
   * Creates an Ed25519 signature from a hexadecimal string.
   *
   * This method allows constructing an Ed25519 signature using its hexadecimal
   * representation.
   *
   * @param hex A string representing the hexadecimal data of the signature.
   * @returns A new instance of `Ed25519Signature`.
   * @throws {Error} If the operation fails, such as due to invalid hexadecimal data
   *                 or memory allocation issues.
   *
   * @example
   * const hexString = 'abcdef0123456789...';
   * try {
   *   const signature = Ed25519Signature.fromHex(hexString);
   *   console.log('Signature created successfully:', signature);
   * } catch (error) {
   *   console.error('Failed to create Ed25519 signature from hex:', error);
   * }
   */
  public static fromHex(hex: string): Ed25519Signature {
    const module = getModule();
    const signaturePtrPtr = module._malloc(4);
    const hexPtr = writeStringToMemory(hex);

    try {
      const result = module.ed25519_signature_from_hex(hexPtr, hex.length, signaturePtrPtr);

      assertSuccess(result, 'Failed to create Ed25519 signature from hex.');

      const signaturePtr = module.getValue(signaturePtrPtr, 'i32');
      return new Ed25519Signature(signaturePtr);
    } finally {
      module._free(hexPtr);
      module._free(signaturePtrPtr);
    }
  }

  /**
   * Converts the Ed25519 signature to a raw byte array.
   *
   * This method serializes the Ed25519 signature into its raw binary representation.
   *
   * @returns A `Uint8Array` containing the raw byte representation of the signature.
   *
   * @throws {Error} If the operation fails, such as due to memory allocation issues
   * or internal errors in the underlying WASM module.
   *
   * @example
   * try {
   *   const signature = Ed25519Signature.fromHex('abcdef0123456789...');
   *   const bytes = signature.toBytes();
   *   console.log('Signature as raw bytes:', bytes);
   * } catch (error) {
   *   console.error('Failed to convert Ed25519 signature to bytes:', error);
   * }
   */
  public toBytes(): Uint8Array {
    const module = getModule();
    const size = this.getBytesSize();
    const bufferPtr = module._malloc(size);

    try {
      const result = module.ed25519_signature_to_bytes(this.ptr, bufferPtr, size);

      assertSuccess(result, 'Failed to convert Ed25519 signature to bytes.');

      return new Uint8Array(module.HEAPU8.subarray(bufferPtr, bufferPtr + size));
    } finally {
      module._free(bufferPtr);
    }
  }

  /**
   * Converts the Ed25519 signature to a hexadecimal string.
   *
   * This method serializes the Ed25519 signature into a human-readable hexadecimal string.
   *
   * @returns A string containing the hexadecimal representation of the signature.
   *
   * @throws {Error} If the operation fails, such as due to memory allocation issues
   * or internal errors in the underlying WASM module.
   *
   * @example
   * try {
   *   const signature = Ed25519Signature.fromBytes(new Uint8Array([0x01, 0x02, 0x03]));
   *   const hex = signature.toHex();
   *   console.log('Signature as hex:', hex);
   * } catch (error) {
   *   console.error('Failed to convert Ed25519 signature to hex:', error);
   * }
   */
  public toHex(): string {
    const module = getModule();
    const size = this.getHexSize();
    const hexPtr = module._malloc(size);

    try {
      const result = module.ed25519_signature_to_hex(this.ptr, hexPtr, size);

      assertSuccess(result, 'Failed to convert Ed25519 signature to hex.');

      return module.UTF8ToString(hexPtr);
    } finally {
      module._free(hexPtr);
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
    return module.ed25519_signature_refcount(this.ptr);
  }

  /**
   * Retrieves the size in bytes of the Ed25519Signature.
   * @returns The size in bytes.
   * @throws {Error} If the operation fails.
   * @private
   */
  private getBytesSize(): number {
    const module = getModule();
    return module.ed25519_signature_get_bytes_size(this.ptr);
  }

  /**
   * Retrieves the size of the Ed25519Signature in hexadecimal form.
   * @returns The size in hexadecimal representation.
   * @throws {Error} If the operation fails.
   * @private
   */
  private getHexSize(): number {
    const module = getModule();
    return module.ed25519_signature_get_hex_size(this.ptr);
  }
}
