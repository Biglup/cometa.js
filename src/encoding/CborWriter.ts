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

import { CborTag } from './CborTag';
import { finalizationRegistry } from '../garbageCollection/finalizationRegistry';
import { getErrorString, splitToLowHigh64bit, writeStringToMemory } from '../marshaling';
import { getModule } from '../module';

/* DEFINITIONS ****************************************************************/

/**
 * A class for encoding data into the Concise Binary Object Representation (CBOR) format.
 *
 * This class provides a high-level interface for constructing CBOR-encoded data items.
 * It manages the underlying CBOR writer instance and ensures proper memory management.
 */
export class CborWriter {
  /**
   * The internal pointer to the native CBOR writer instance.
   * This pointer is managed internally and should not be modified directly.
   */
  public readonly ptr: number;

  /**
   * Creates a new instance of the `CborWriter` class.
   *
   * This constructor initializes a new native CBOR writer instance and ensures
   * it is ready for use. Throws an error if the writer instance cannot be created.
   */
  constructor() {
    const module = getModule();
    this.ptr = module.cbor_writer_new();

    if (!this.ptr) {
      throw new Error('Failed to create CborWriter.');
    }

    finalizationRegistry.register(this, {
      freeFunc: module.cbor_writer_unref,
      ptr: this.ptr
    });
  }

  /**
   * Encodes and writes a `BigInt` value as a CBOR bignum.
   *
   * This method writes a big integer value into the CBOR stream using the appropriate
   * CBOR tag for bignum encoding. It supports both positive and negative bignums.
   *
   * @param value - The `BigInt` value to encode and write.
   * @throws {Error} Throws an error if the encoding fails.
   *
   * @return {CborWriter} The current `CborWriter` instance.
   */
  public writeBigInt(value: BigInt): CborWriter {
    const module = getModule();
    const memory = module.HEAPU8;
    const bigintStr = value.toString();
    const strPtr = writeStringToMemory(bigintStr, memory);

    const bigintPtrPtr = module._malloc(4);

    try {
      const result = module.bigint_from_string(strPtr, bigintStr.length, 10, bigintPtrPtr);

      if (result !== 0) {
        throw new Error('Failed to create cardano_bigint_t from string.');
      }

      const bigintPtr = module.getValue(bigintPtrPtr, 'i32');

      try {
        const writeResult = module.cbor_writer_write_bigint(this.ptr, bigintPtr);

        if (writeResult !== 0) {
          throw new Error(this.getLastError());
        }
      } finally {
        module.bigint_unref(bigintPtrPtr);
      }
    } finally {
      module._free(bigintPtrPtr);
      module._free(strPtr);
    }

    return this;
  }

  /**
   * Encodes and writes a boolean value as a CBOR simple value.
   *
   * This method writes a boolean value (`true` or `false`) into the CBOR stream.
   * CBOR encodes boolean values as simple values (major type 7).
   *
   * @param value - The boolean value to encode and write.
   *
   * @return {CborWriter} The current `CborWriter` instance.
   * @throws {Error} Throws an error if the encoding operation fails.
   */
  public writeBoolean(value: boolean): CborWriter {
    const result = getModule().cbor_writer_write_bool(this.ptr, value);
    if (result !== 0) {
      const errorMsg = `Failed to write boolean value: ${getErrorString(result)} ${this.getLastError()}`;
      throw new Error(errorMsg);
    }

    return this;
  }

  /**
   * Encodes and writes a byte string as a CBOR data item.
   *
   * This method writes a byte string (`Uint8Array`) into the CBOR stream. CBOR encodes
   * byte strings as major type 2.
   *
   * @param data - The byte string to encode and write as a `Uint8Array`.
   *
   * @return {CborWriter} The current `CborWriter` instance.
   * @throws {Error} Throws an error if the encoding operation fails.
   */
  public writeByteString(data: Uint8Array): CborWriter {
    const bufferPtr = getModule()._malloc(data.length);
    try {
      getModule().HEAPU8.set(data, bufferPtr);

      const { low, high } = splitToLowHigh64bit(data.length);
      const result = getModule().cbor_writer_write_bytestring(this.ptr, bufferPtr, low, high);
      if (result !== 0) {
        const errorMsg = `Failed to write byte string value: ${getErrorString(result)} ${this.getLastError()}`;
        throw new Error(errorMsg);
      }
    } finally {
      getModule()._free(bufferPtr);
    }

    return this;
  }

  /**
   * Encodes and writes a UTF-8 encoded text string as a CBOR data item.
   *
   * This method writes a text string into the CBOR stream. CBOR encodes text strings
   * as major type 3.
   *
   * @param text - The text string to encode and write.
   *
   * @return {CborWriter} The current `CborWriter` instance.
   * @throws {Error} Throws an error if the encoding operation fails.
   */
  public writeTextString(text: string): CborWriter {
    const module = getModule();
    const memory = module.HEAPU8;

    const encoder = new TextEncoder();
    const encodedText = encoder.encode(text);

    const textPtr = writeStringToMemory(text, memory);
    const { low, high } = splitToLowHigh64bit(encodedText.length);

    try {
      const result = module.cbor_writer_write_textstring(this.ptr, textPtr, low, high);

      if (result !== 0) {
        const errorMsg = `Failed to write text string value: ${getErrorString(result)} ${this.getLastError()}`;
        throw new Error(errorMsg);
      }
    } finally {
      module._free(textPtr);
    }

    return this;
  }

  /**
   * Writes a pre-encoded CBOR data item into the CBOR stream.
   *
   * This method directly writes a byte array containing a pre-encoded CBOR data item
   * into the CBOR stream. This is useful for embedding CBOR data items that have
   * already been encoded elsewhere.
   *
   * @param data - The byte array containing the pre-encoded CBOR data item.
   *
   * @return {CborWriter} The current `CborWriter` instance.
   * @throws {Error} Throws an error if the operation fails.
   */
  public writeEncoded(data: Uint8Array): CborWriter {
    const bufferPtr = getModule()._malloc(data.length);
    try {
      getModule().HEAPU8.set(data, bufferPtr);
      const result = getModule().cbor_writer_write_encoded(this.ptr, bufferPtr, data.length);
      if (result !== 0) {
        const errorMsg = `Failed to write encoded value: ${getErrorString(result)} ${this.getLastError()}`;
        throw new Error(errorMsg);
      }
    } finally {
      getModule()._free(bufferPtr);
    }

    return this;
  }

  /**
   * Begins the encoding of a CBOR array.
   *
   * This method writes the start of a CBOR array into the CBOR stream. CBOR arrays are
   * encoded as major type 4. The `size` parameter specifies the number of elements in
   * the array for definite-length arrays. For indefinite-length arrays, pass `-1` as
   * the size.
   *
   * @param size - The number of elements in the array. Use `-1` for an indefinite-length array.
   *
   * @return {CborWriter} The current `CborWriter` instance.
   * @throws {Error} Throws an error if the operation fails.
   */
  public startArray(size?: number): CborWriter {
    if (size === undefined || size === null) size = -1;

    const { low, high } = splitToLowHigh64bit(size);
    const result = getModule().cbor_writer_write_start_array(this.ptr, low, high);
    if (result !== 0) {
      const errorMsg = `Failed to write start array: ${getErrorString(result)} ${this.getLastError()}`;
      throw new Error(errorMsg);
    }

    return this;
  }

  /**
   * Ends the encoding of an indefinite-length CBOR array.
   *
   * This method writes the stop code to indicate the end of an indefinite-length
   * CBOR array (major type 4). It must only be called after `startArray` has been
   * called with `-1` as the size.
   *
   * @return {CborWriter} The current `CborWriter` instance.
   * @throws {Error} Throws an error if the operation fails.
   */
  public endArray(): CborWriter {
    const result = getModule().cbor_writer_write_end_array(this.ptr);
    if (result !== 0) {
      const errorMsg = `Failed to write end array: ${getErrorString(result)} ${this.getLastError()}`;
      throw new Error(errorMsg);
    }

    return this;
  }

  /**
   * Begins the encoding of a CBOR map.
   *
   * This method writes the start of a CBOR map into the CBOR stream. CBOR maps are
   * encoded as major type 5. The `size` parameter specifies the number of key-value
   * pairs in the map for definite-length maps. For indefinite-length maps, pass `-1`
   * as the size.
   *
   * @param size - The number of key-value pairs in the map. Use `-1` for an indefinite-length map.
   *
   * @return {CborWriter} The current `CborWriter` instance.
   * @throws {Error} Throws an error if the operation fails.
   */
  public startMap(size?: number): CborWriter {
    if (size === undefined || size === null) size = -1;

    const { low, high } = splitToLowHigh64bit(size);

    const result = getModule().cbor_writer_write_start_map(this.ptr, low, high);
    if (result !== 0) {
      const errorMsg = `Failed to write start map: ${getErrorString(result)} ${this.getLastError()}`;
      throw new Error(errorMsg);
    }

    return this;
  }

  /**
   * Ends the encoding of an indefinite-length CBOR map.
   *
   * This method writes the stop code to indicate the end of an indefinite-length
   * CBOR map (major type 5). It must only be called after `startMap` has been
   * called with `-1` as the size.
   *
   * @throws {Error} Throws an error if the operation fails.
   *
   * @return {CborWriter} The current `CborWriter` instance.
   */
  public endMap(): CborWriter {
    const result = getModule().cbor_writer_write_end_map(this.ptr);
    if (result !== 0) {
      const errorMsg = `Failed to write end map: ${getErrorString(result)} ${this.getLastError()}`;
      throw new Error(errorMsg);
    }

    return this;
  }

  /**
   * Encodes and writes an integer as a CBOR data item.
   *
   * This method writes a integer value into the CBOR stream. CBOR encodes integers
   * as either major type 0 (positive integers) or major type 1 (negative integers).
   *
   * @param value - The integer value to encode and write. This can be a `number` or `bigint`.
   *
   * @return {CborWriter} The current `CborWriter` instance.
   * @throws {Error} Throws an error if the encoding operation fails or if the value exceeds
   * the range of a 64-bit signed integer.
   */
  public writeInt(value: number | bigint): CborWriter {
    if (value < 0) {
      this.writeSignedInt(value);
    } else {
      this.writeUnsignedInt(value);
    }

    return this;
  }

  /**
   * Encodes and writes an unsigned integer as a CBOR data item.
   *
   * This method writes an unsigned integer value into the CBOR stream. CBOR encodes unsigned
   * integers as major type 0.
   *
   * @param value - The unsigned integer value to encode and write. This can be a `number` or `bigint`.
   *
   * @return {CborWriter} The current `CborWriter` instance.
   * @throws {Error} Throws an error if the encoding operation fails or if the value exceeds
   * the range of a 64-bit unsigned integer.
   */
  public writeUnsignedInt(value: number | bigint): CborWriter {
    const { low, high } = splitToLowHigh64bit(value);
    const result = getModule().cbor_writer_write_uint(this.ptr, low, high);
    if (result !== 0) {
      const errorMsg = `Failed to write unsigned int: ${getErrorString(result)} ${this.getLastError()}`;
      throw new Error(errorMsg);
    }

    return this;
  }

  /**
   * Encodes and writes a signed integer as a CBOR data item.
   *
   * This method writes a signed integer value into the CBOR stream. CBOR encodes signed integers
   * as either major type 0 (for positive integers) or major type 1 (for negative integers).
   *
   * @param value - The signed integer value to encode and write. This can be a `number` or `bigint`.
   *
   * @return {CborWriter} The current `CborWriter` instance.
   * @throws {Error} Throws an error if the encoding operation fails or if the value exceeds
   * the range of a 64-bit signed integer.
   */
  public writeSignedInt(value: number | bigint): CborWriter {
    const { low, high } = splitToLowHigh64bit(value);
    const result = getModule().cbor_writer_write_signed_int(this.ptr, low, high);
    if (result !== 0) {
      const errorMsg = `Failed to write signed int: ${getErrorString(result)} ${this.getLastError()}`;
      throw new Error(errorMsg);
    }

    return this;
  }

  /**
   * Encodes and writes a null value as a CBOR data item.
   *
   * This method writes a `null` value into the CBOR stream. CBOR encodes null values as
   * a simple value with major type 7 and additional information 22.
   *
   * @return {CborWriter} The current `CborWriter` instance.
   * @throws {Error} Throws an error if the encoding operation fails.
   */
  public writeNull(): CborWriter {
    const result = getModule().cbor_writer_write_null(this.ptr);
    if (result !== 0) {
      const errorMsg = `Failed to write null: ${getErrorString(result)} ${this.getLastError()}`;
      throw new Error(errorMsg);
    }

    return this;
  }

  /**
   * Encodes and writes an undefined value as a CBOR data item.
   *
   * This method writes an `undefined` value into the CBOR stream. CBOR encodes undefined
   * values as a simple value with major type 7 and additional information 23.
   *
   * @return {CborWriter} The current `CborWriter` instance.
   * @throws {Error} Throws an error if the encoding operation fails.
   */
  public writeUndefined(): CborWriter {
    const result = getModule().cbor_writer_write_undefined(this.ptr);
    if (result !== 0) {
      const errorMsg = `Failed to write undefined: ${getErrorString(result)} ${this.getLastError()}`;
      throw new Error(errorMsg);
    }

    return this;
  }

  /**
   * Encodes and writes a CBOR semantic tag.
   *
   * This method writes a semantic tag into the CBOR stream. CBOR tags are encoded as major type 6
   * and provide additional context or meaning for the data that follows. For example, a tag may
   * indicate a date, a base64-encoded string, or another semantic type.
   *
   * @param tag - The semantic tag to encode and write, represented as a value of the `CborTag` enum or a number.
   *
   * @return {CborWriter} The current `CborWriter` instance.
   * @throws {Error} Throws an error if the encoding operation fails.
   */
  public writeTag(tag: CborTag | number): CborWriter {
    const result = getModule().cbor_writer_write_tag(this.ptr, tag);
    if (result !== 0) {
      const errorMsg = `Failed to write tag: ${getErrorString(result)} ${this.getLastError()}`;
      throw new Error(errorMsg);
    }

    return this;
  }

  /**
   * Finalizes the CBOR encoding process and retrieves the encoded data.
   *
   * This method computes the final CBOR representation of all the data items
   * written to the writer. It allocates and returns a `Uint8Array` containing
   * the serialized CBOR data.
   *
   * @returns {Uint8Array} A `Uint8Array` containing the CBOR-encoded data.
   * @throws {Error} Throws an error if the encoding process fails.
   */
  public encode(): Uint8Array {
    const module = getModule();
    const size = module.cbor_writer_get_encode_size(this.ptr);
    const bufferPtr = module._malloc(size);
    try {
      const result = module.cbor_writer_encode(this.ptr, bufferPtr, size);
      if (result !== 0) {
        const errorMsg = `Failed to encode data: ${getErrorString(result)} ${this.getLastError()}`;
        throw new Error(errorMsg);
      }
      return new Uint8Array(module.HEAPU8.subarray(bufferPtr, bufferPtr + size));
    } finally {
      module._free(bufferPtr);
    }
  }

  /**
   * Finalizes the CBOR encoding process and retrieves the encoded data as a hexadecimal string.
   *
   * This method computes the final CBOR representation of all the data items
   * written to the writer and returns the serialized CBOR data as a hexadecimal string.
   *
   * @returns {string} A string containing the CBOR-encoded data in hexadecimal format.
   * @throws {Error} Throws an error if the encoding process fails.
   */
  public encodeHex(): string {
    const module = getModule();

    const hexSize = module.cbor_writer_get_hex_size(this.ptr);
    if (hexSize === 0) {
      throw new Error('Failed to get hex size: Writer contains no data or is invalid.');
    }

    const hexPtr = module._malloc(hexSize);
    try {
      const result = module.cbor_writer_encode_hex(this.ptr, hexPtr, hexSize);

      if (result !== 0) {
        const errorMsg = `Failed to encode hex: ${getErrorString(result)} ${this.getLastError()}`;
        throw new Error(errorMsg);
      }

      return module.UTF8ToString(hexPtr);
    } finally {
      module._free(hexPtr);
    }
  }

  /**
   * Resets the CBOR writer, clearing all written data.
   *
   * This method resets the internal state of the CBOR writer, effectively removing any data
   * that has been written. It allows the writer to be reused for a new CBOR encoding session.
   *
   * @return {CborWriter} The current `CborWriter` instance.
   * @throws {Error} Throws an error if the reset operation fails.
   */
  public reset(): CborWriter {
    const result = getModule().cbor_writer_reset(this.ptr);
    if (result !== 0) {
      const errorMsg = `Failed to reset writer: ${getErrorString(result)} ${this.getLastError()}`;
      throw new Error(errorMsg);
    }

    return this;
  }

  /**
   * Retrieves the last error message recorded by the CBOR writer.
   *
   * This method provides a human-readable description of the last error
   * encountered during CBOR encoding operations. If no error has occurred,
   * it returns an empty string.
   *
   * @returns {string} A string describing the last error message, or empty if no message is available.
   */
  public getLastError(): string {
    const module = getModule();
    const errorPtr = module.cbor_writer_get_last_error(this.ptr);
    return errorPtr ? module.UTF8ToString(errorPtr, 1024) : '';
  }

  /**
   * The reference count retrieved by this method reflects the number of references maintained internally by
   * libcardano-c for this native instance of the CBOR writer object. This is unrelated to the reference counting
   * mechanism in JavaScript, which is managed by the JavaScript engine's garbage collector.
   *
   * This method is primarily intended for diagnostic purposes.
   *
   * @returns {number} The current reference count of the CBOR writer in the WASM context.
   */
  getRefCount(): number {
    return getModule().cbor_writer_refcount(this.ptr);
  }
}
