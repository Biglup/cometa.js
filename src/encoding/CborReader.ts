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

import { CborReaderState } from './CborReaderState';
import { CborSimpleValue } from './CborSimpleValue';
import { CborTag } from './CborTag';
import { assertSuccess, readBufferData, readI64, writeStringToMemory } from '../marshaling';
import { finalizationRegistry } from '../garbageCollection/finalizationRegistry';
import { getModule } from '../module';

/* DEFINITIONS ****************************************************************/

/**
 * A class for reading CBOR (Concise Binary Object Representation) data.
 *
 * The `CborReader` class provides methods for decoding and extracting various data types
 * from a CBOR-encoded binary stream. It supports handling integers, strings, arrays, maps,
 * and other CBOR data structures.
 */
export class CborReader {
  public ptr: number;

  /**
   * Creates a new `CborReader` instance with the given native pointer.
   *
   * @param {number} ptr - A pointer to the native CBOR reader instance.
   * @private
   */
  private constructor(ptr: any) {
    this.ptr = ptr;
    finalizationRegistry.register(this, {
      freeFunc: getModule().cbor_reader_unref,
      ptr: this.ptr
    });
  }

  /**
   * Creates a new `CborReader` from a binary CBOR-encoded data.
   *
   * @param {Uint8Array} data - The CBOR-encoded binary data to be read.
   * @returns {CborReader} A new instance of the `CborReader` class.
   * @throws {Error} If the native `CborReader` could not be created.
   */
  public static from(data: Uint8Array): CborReader {
    const dataPtr = getModule()._malloc(data.length);

    try {
      getModule().HEAPU8.set(data, dataPtr);
      const ptr = getModule().cbor_reader_new(dataPtr, data.length);

      if (!ptr) {
        throw new Error('Failed to create CborReader.');
      }

      return new CborReader(ptr);
    } finally {
      getModule()._free(dataPtr);
    }
  }

  /**
   * Creates a new `CborReader` from a CBOR-encoded hexadecimal string.
   *
   * @param {string} hexString - The CBOR-encoded data in hexadecimal string format.
   * @returns {CborReader} A new instance of the `CborReader` class.
   * @throws {Error} If the native `CborReader` could not be created.
   */
  public static fromHex(hexString: string): CborReader {
    const module = getModule();
    const memory = module.HEAPU8;

    const hexPtr = writeStringToMemory(hexString, memory);
    try {
      const ptr = module.cbor_reader_from_hex(hexPtr, hexString.length);
      if (!ptr) {
        throw new Error('Failed to create CborReader from hex.');
      }
      return new CborReader(ptr);
    } finally {
      module._free(hexPtr);
    }
  }

  /**
   * Retrieves the current state of the CBOR reader without consuming any data.
   *
   * This method allows you to inspect the next data item's type or structure in the CBOR stream
   * without advancing the reader's position. It is useful for determining the type of the next
   * value to decide how to process it.
   *
   * @returns {CborReaderState} The current state of the reader, represented as a `CborReaderState` enum value.
   * @throws {Error} If the state could not be retrieved. The error includes details of the failure.
   */
  public peekState(): CborReaderState {
    const module = getModule();
    const statePtr = module._malloc(4);
    try {
      const result = module.cbor_reader_peek_state(this.ptr, statePtr);

      assertSuccess(result, this.getLastError());

      return module.getValue(statePtr, 'i32') as CborReaderState;
    } finally {
      module._free(statePtr);
    }
  }

  /**
   * Retrieves the total number of unread bytes remaining in the CBOR reader's buffer.
   *
   * @returns {number} The number of unread bytes remaining in the buffer.
   * @throws {Error} If the native function call fails.
   */
  public getBytesRemaining(): number {
    const module = getModule();

    const bytesRemainingPtr = module._malloc(8);
    try {
      const result = module.cbor_reader_get_bytes_remaining(this.ptr, bytesRemainingPtr);

      assertSuccess(result, this.getLastError());

      const bytesRemaining = readI64(bytesRemainingPtr, false);

      return Number(bytesRemaining);
    } finally {
      module._free(bytesRemainingPtr);
    }
  }

  /**
   * Retrieves the remaining bytes from the CBOR reader.
   *
   * @returns {Uint8Array} A `Uint8Array` containing the remaining bytes.
   * @throws {Error} If the native function call fails.
   */
  public getRemainderBytes(): Uint8Array {
    const module = getModule();
    const bufferPtr = module._malloc(4);

    try {
      const result = module.cbor_reader_get_remainder_bytes(this.ptr, bufferPtr);

      assertSuccess(result, this.getLastError());

      const bufferObjPtr = module.getValue(bufferPtr, 'i32');

      return readBufferData(bufferObjPtr);
    } finally {
      module._free(bufferPtr);
    }
  }

  /**
   * Returns a Deep clone of the current `CborReader`.
   *
   * @returns {CborReader} A new `CborReader` instance cloned from the current one.
   * @throws {Error} If the clone operation fails.
   */
  public clone(): CborReader {
    const module = getModule();

    const clonePtr = module._malloc(4);

    try {
      const result = module.cbor_reader_clone(this.ptr, clonePtr);

      assertSuccess(result, this.getLastError());

      const clonedReaderPtr = module.getValue(clonePtr, 'i32');

      if (!clonedReaderPtr) {
        throw new Error('Cloned CBOR reader pointer is NULL.');
      }

      return new CborReader(clonedReaderPtr);
    } finally {
      module._free(clonePtr);
    }
  }

  /**
   * Skips the current CBOR value in the stream.
   *
   * This function moves the reader past the current CBOR data item without decoding it.
   * It is particularly useful when you want to ignore a value in the CBOR stream,
   * for example, when the value is not relevant to your application logic.
   *
   * @throws {Error} If the skip operation fails.
   *         The error will include the reason for failure, as reported by the underlying CBOR reader.
   */
  public skipValue(): void {
    const module = getModule();

    const result = module.cbor_reader_skip_value(this.ptr);

    assertSuccess(result, this.getLastError());
  }

  /**
   * Reads and returns the next CBOR data item in its encoded byte form.
   *
   * This method retrieves the raw encoded bytes of the next CBOR data item, preserving
   * its exact representation in the stream. This is useful for scenarios where the
   * encoded value needs to be stored, inspected, or reprocessed.
   *
   * @returns {Uint8Array} A `Uint8Array` containing the encoded bytes of the next CBOR data item.
   * @throws {Error} If the encoded value could not be read. The error includes details of the failure.
   */
  public readEncodedValue(): Uint8Array {
    const module = getModule();
    const bufferPtr = module._malloc(4);

    try {
      const result = module.cbor_reader_read_encoded_value(this.ptr, bufferPtr);

      assertSuccess(result, this.getLastError());

      const bufferObjPtr = module.getValue(bufferPtr, 'i32');

      return readBufferData(bufferObjPtr);
    } finally {
      module._free(bufferPtr);
    }
  }

  /**
   * Reads a signed integer from the CBOR stream.
   *
   * This method decodes and retrieves the next CBOR data item as a signed 64-bit integer.
   * It ensures that the integer is correctly interpreted based on its signed representation.
   *
   * @returns {BigInt} The signed integer read from the CBOR stream as a BigInt.
   * @throws {Error} If the signed integer could not be read. The error includes details of the failure.
   */
  public readSignedInt(): BigInt {
    const module = getModule();
    const valuePtr = module._malloc(8);
    try {
      const result = module.cbor_reader_read_int(this.ptr, valuePtr);

      assertSuccess(result, this.getLastError());

      return readI64(valuePtr, true);
    } finally {
      module._free(valuePtr);
    }
  }

  /**
   * Reads an unsigned integer from the CBOR stream.
   *
   * This method decodes and retrieves the next CBOR data item as an unsigned 64-bit integer.
   * It ensures that the integer is correctly interpreted based on its unsigned representation.
   *
   * @returns {BigInt} The unsigned integer read from the CBOR stream as a BigInt.
   * @throws {Error} If the unsigned integer could not be read. The error includes details of the failure.
   */
  public readUnsignedInt(): BigInt {
    const module = getModule();
    const valuePtr = module._malloc(8);
    try {
      const result = module.cbor_reader_read_uint(this.ptr, valuePtr);

      assertSuccess(result, this.getLastError());

      return readI64(valuePtr, false);
    } finally {
      module._free(valuePtr);
    }
  }

  /**
   * Reads a big integer (BigInt) from the CBOR stream.
   *
   * This method decodes and retrieves the next CBOR data item as a big integer.
   * CBOR bignums are used to represent integers too large to fit into standard 64-bit representations.
   *
   * @returns {BigInt} The decoded big integer from the CBOR stream.
   * @throws {Error} If the big integer could not be read. The error includes details of the failure.
   */
  public readBigInt(): BigInt {
    const module = getModule();
    const bigintPtrPtr = module._malloc(4);

    try {
      const result = module.cbor_reader_read_bigint(this.ptr, bigintPtrPtr);

      assertSuccess(result, this.getLastError());

      const bigintPtr = module.getValue(bigintPtrPtr, '*');

      const stringSize = module.bigint_get_string_size(bigintPtr, 10);

      if (stringSize === 0) {
        throw new Error('Failed to determine the string size of the bigint.');
      }

      const stringBuffer = module._malloc(stringSize);

      try {
        const stringResult = module.bigint_to_string(bigintPtr, stringBuffer, stringSize, 10);

        assertSuccess(stringResult, this.getLastError());

        const bigintString = getModule().UTF8ToString(stringBuffer);

        return BigInt(bigintString);
      } finally {
        module._free(stringBuffer);
      }
    } finally {
      const bigintPtr = module.getValue(bigintPtrPtr, '*');

      module.bigint_unref(bigintPtr);

      module._free(bigintPtrPtr);
    }
  }

  /**
   * Reads a double-precision floating-point number from the CBOR stream.
   *
   * This method decodes and retrieves the next CBOR data item as a double-precision
   * floating-point number (IEEE 754 format). It is suitable for processing CBOR items
   * encoded as floating-point numbers.
   *
   * @returns {number} The decoded double-precision floating-point number.
   * @throws {Error} If the double could not be read. The error includes details of the failure.
   */
  public readDouble(): number {
    const module = getModule();
    const valuePtr = module._malloc(8);

    try {
      const result = module.cbor_reader_read_double(this.ptr, valuePtr);

      assertSuccess(result, this.getLastError());

      return module.getValue(valuePtr, 'double');
    } finally {
      module._free(valuePtr);
    }
  }

  /**
   * Reads a CBOR simple value (major type 7) from the CBOR stream.
   *
   * CBOR simple values include `false`, `true`, `null`, `undefined`, and other custom simple values
   * represented as major type 7.
   *
   * @returns {CborSimpleValue} The decoded simple value as a `CborSimpleValue` enum.
   * @throws {Error} If the simple value could not be read. The error includes details of the failure.
   */
  public readSimpleValue(): CborSimpleValue {
    const module = getModule();
    const valuePtr = module._malloc(4);

    try {
      const result = module.cbor_reader_read_simple_value(this.ptr, valuePtr);

      assertSuccess(result, this.getLastError());

      const simpleValue = module.getValue(valuePtr, 'i32');

      return simpleValue as CborSimpleValue;
    } finally {
      module._free(valuePtr);
    }
  }

  /**
   * Reads the beginning of a CBOR map (major type 5).
   *
   * This method reads the CBOR stream and retrieves the number of key-value pairs in the map.
   * If the map has an indefinite length, the returned size will be `-1`. After calling this method,
   * the CBOR reader state transitions to process the key-value pairs within the map.
   *
   * @returns {number} The number of key-value pairs in the map or `-1` for indefinite-length maps.
   * @throws {Error} If the start of the map could not be read. The error includes details of the failure.
   */
  public readStartMap(): number {
    const module = getModule();
    const sizePtr = module._malloc(8);

    try {
      const result = module.cbor_reader_read_start_map(this.ptr, sizePtr);

      assertSuccess(result, this.getLastError());

      return Number(readI64(sizePtr, true));
    } finally {
      module._free(sizePtr);
    }
  }

  /**
   * Reads the end of a CBOR map (major type 5).
   *
   * This method ensures that the CBOR reader is positioned at the end of a map
   * and validates that all key-value pairs have been properly read.
   *
   * @throws {Error} If the end of the map could not be read. The error includes details of the failure.
   */
  public readEndMap(): void {
    const module = getModule();

    const result = module.cbor_reader_read_end_map(this.ptr);

    assertSuccess(result, this.getLastError());
  }

  /**
   * Reads the start of a CBOR array (major type 4).
   *
   * This method reads the initial marker of a CBOR array and returns its length. For definite-length arrays,
   * the length represents the number of items in the array. For indefinite-length arrays, the length will
   * return `-1`, and the array will end with a special "break" marker.
   *
   * @returns {number} The number of items in the array for definite-length arrays, or `-1` for indefinite-length arrays.
   * @throws {Error} If the start of the array could not be read. The error includes details of the failure.
   */
  public readStartArray(): number {
    const module = getModule();
    const sizePtr = module._malloc(8);

    try {
      const result = module.cbor_reader_read_start_array(this.ptr, sizePtr);

      assertSuccess(result, this.getLastError());

      return Number(readI64(sizePtr, true));
    } finally {
      module._free(sizePtr);
    }
  }

  /**
   * Reads the end of a CBOR array (major type 4).
   *
   * This method is used to signify the completion of reading a CBOR array. It validates
   * the presence of the end marker for both definite-length and indefinite-length arrays.
   *
   * @throws {Error} If the end of the array could not be read. The error message includes
   * details about the failure reason.
   */
  public readEndArray(): void {
    const module = getModule();

    const result = module.cbor_reader_read_end_array(this.ptr);

    assertSuccess(result, this.getLastError());
  }

  /**
   * Reads a CBOR boolean value (true or false).
   *
   * This method decodes and reads a CBOR-encoded boolean value (major type 7, simple values 20 and 21)
   * from the current position in the reader. It supports CBOR representations for `true` and `false`.
   *
   * @returns {boolean} The decoded boolean value (`true` or `false`).
   * @throws {Error} If the boolean value could not be read due to an invalid state or parsing error.
   */
  public readBoolean(): boolean {
    const module = getModule();
    const boolPtr = module._malloc(1);
    try {
      const result = module.cbor_reader_read_bool(this.ptr, boolPtr);

      assertSuccess(result, this.getLastError());

      return !!module.getValue(boolPtr, 'i8');
    } finally {
      module._free(boolPtr);
    }
  }

  /**
   * Reads a CBOR `null` value.
   *
   * This method decodes and validates a CBOR-encoded `null` value (major type 7, simple value 22)
   * from the current position in the reader. It ensures the value represents `null` and moves
   * the reader to the next data item in the CBOR stream.
   *
   * @throws {Error} If the value at the current position is not a valid CBOR `null`,
   * or if any parsing error occurs.
   */
  public readNull(): void {
    const result = getModule().cbor_reader_read_null(this.ptr);
    assertSuccess(result, this.getLastError());
  }

  /**
   * Reads a CBOR byte string.
   *
   * This method decodes a CBOR-encoded byte string (major type 2) from the current position
   * in the reader and returns it as a `Uint8Array`.
   *
   * @returns {Uint8Array} A `Uint8Array` containing the decoded byte string.
   * @throws {Error} If the value at the current position is not a valid CBOR byte string,
   * or if any decoding error occurs.
   */
  public readByteString(): Uint8Array {
    const module = getModule();
    const bufferPtr = module._malloc(4);

    try {
      const result = module.cbor_reader_read_bytestring(this.ptr, bufferPtr);

      assertSuccess(result, this.getLastError());

      const bufferObjPtr = module.getValue(bufferPtr, 'i32');

      return readBufferData(bufferObjPtr);
    } finally {
      module._free(bufferPtr);
    }
  }

  /**
   * Reads a CBOR text string.
   *
   * This method decodes a CBOR-encoded text string (major type 3) from the current position
   * in the reader and returns it as a JavaScript string.
   *
   * @returns {string} A JavaScript string containing the decoded CBOR text string.
   * @throws {Error} If the value at the current position is not a valid CBOR text string,
   * or if any decoding error occurs.
   */
  public readTextString(): string {
    const module = getModule();
    const bufferPtr = module._malloc(4);

    try {
      const result = module.cbor_reader_read_textstring(this.ptr, bufferPtr);

      assertSuccess(result, this.getLastError());

      const bufferObjPtr = module.getValue(bufferPtr, 'i32');

      const buffer = readBufferData(bufferObjPtr);

      return new TextDecoder().decode(buffer);
    } finally {
      module._free(bufferPtr);
    }
  }

  /**
   * Reads a CBOR tag (major type 6).
   *
   * This method decodes a CBOR-encoded tag (semantic tag) from the current position
   * in the reader and returns it as a `CborTag` value. CBOR tags provide semantic
   * context to the data that follows them, such as indicating a timestamp or a URI.
   *
   * @returns {CborTag} The decoded CBOR tag as an enum value.
   * @throws {Error} If the value at the current position is not a valid CBOR tag
   * or if any decoding error occurs.
   */
  public readTag(): CborTag {
    const module = getModule();
    const tagPtr = module._malloc(4);

    try {
      const result = module.cbor_reader_read_tag(this.ptr, tagPtr);

      assertSuccess(result, this.getLastError());

      const tagValue = module.getValue(tagPtr, 'i32');

      return tagValue as CborTag;
    } finally {
      module._free(tagPtr);
    }
  }

  /**
   * Peeks the next CBOR tag (major type 6) without advancing the reader's position.
   *
   * This method examines the next CBOR-encoded tag (semantic tag) in the stream
   * without consuming it. CBOR tags provide semantic context to the data that follows,
   * such as indicating a timestamp or a URI. Use this method to inspect the next tag
   * before deciding how to process it.
   *
   * @returns {CborTag} The CBOR tag at the current position, as an enum value.
   * @throws {Error} If the value at the current position is not a valid CBOR tag
   * or if any decoding error occurs.
   */
  public peekTag(): CborTag {
    const module = getModule();
    const tagPtr = module._malloc(4);

    try {
      const result = module.cbor_reader_peek_tag(this.ptr, tagPtr);

      assertSuccess(result, this.getLastError());

      const tagValue = module.getValue(tagPtr, 'i32');

      return tagValue as CborTag;
    } finally {
      module._free(tagPtr);
    }
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
    const errorPtr = module.cbor_reader_get_last_error(this.ptr);
    return module.UTF8ToString(errorPtr);
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
  public getRefCount(): number {
    return getModule().cbor_reader_refcount(this.ptr);
  }
}
