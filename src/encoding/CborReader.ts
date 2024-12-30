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
import { finalizationRegistry } from '../garbageCollection/finalizationRegistry';
import { getErrorString, readI64, writeStringToMemory } from '../marshaling';
import { getModule } from '../module';

/* DEFINITIONS ****************************************************************/

// TODO
export class CborReader {
  public ptr: number;

  private constructor(ptr: any) {
    this.ptr = ptr;
    finalizationRegistry.register(this, {
      freeFunc: getModule().cbor_reader_unref,
      ptr: this.ptr
    });
  }

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

  public peekState(): CborReaderState {
    const module = getModule();
    const statePtr = module._malloc(4);
    try {
      const result = module.cbor_reader_peek_state(this.ptr, statePtr);
      if (result !== 0) {
        const errorMsg = `Failed to peak state: ${getErrorString(result)} ${this.getLastError()}`;
        throw new Error(errorMsg);
      }

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

      if (result !== 0) {
        const errorMsg = `Failed to read the remaining bytes: ${getErrorString(result)} ${this.getLastError()}`;
        throw new Error(errorMsg);
      }

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

      if (result !== 0) {
        const errorMsg = `Failed to read the remaining bytes: ${getErrorString(result)} ${this.getLastError()}`;
        throw new Error(errorMsg);
      }

      const bufferObjPtr = module.getValue(bufferPtr, 'i32');

      if (!bufferObjPtr) {
        throw new Error('Failed to retrieve remainder bytes: Buffer pointer is NULL.');
      }

      try {
        const bufferSize = module.buffer_get_size(bufferObjPtr);
        const dataPtr = module.buffer_get_data(bufferObjPtr);

        return new Uint8Array(module.HEAPU8.subarray(dataPtr, dataPtr + bufferSize));
      } finally {
        const ptrPtr = module._malloc(4);
        module.setValue(ptrPtr, bufferObjPtr, 'i32');
        module.buffer_unref(ptrPtr);
        module._free(ptrPtr);
      }
    } finally {
      module._free(bufferPtr);
    }
  }

  public clone(): CborReader {
    const module = getModule();

    const clonePtr = module._malloc(4);

    try {
      const result = module.cbor_reader_clone(this.ptr, clonePtr);

      if (result !== 0) {
        const errorMsg = `Failed to clone reader: ${getErrorString(result)} ${this.getLastError()}`;
        throw new Error(errorMsg);
      }

      const clonedReaderPtr = module.getValue(clonePtr, 'i32');

      if (!clonedReaderPtr) {
        throw new Error('Cloned CBOR reader pointer is NULL.');
      }

      return new CborReader(clonedReaderPtr);
    } finally {
      module._free(clonePtr);
    }
  }

  public skipValue(): void {
    const module = getModule();

    const result = module.cbor_reader_skip_value(this.ptr);

    if (result !== 0) {
      const errorMsg = `Failed to skip CBOR value: ${getErrorString(result)}`;
      throw new Error(errorMsg);
    }
  }

  public readEncodedValue(): Uint8Array {
    const module = getModule();
    const bufferPtr = module._malloc(4);

    try {
      const result = module.cbor_reader_read_encoded_value(this.ptr, bufferPtr);

      if (result !== 0) {
        const errorMsg = `Failed to read the remaining bytes: ${getErrorString(result)} ${this.getLastError()}`;
        throw new Error(errorMsg);
      }

      const bufferObjPtr = module.getValue(bufferPtr, 'i32');

      if (!bufferObjPtr) {
        throw new Error('Failed to retrieve remainder bytes: Buffer pointer is NULL.');
      }

      try {
        const bufferSize = module.buffer_get_size(bufferObjPtr);
        const dataPtr = module.buffer_get_data(bufferObjPtr);

        return new Uint8Array(module.HEAPU8.subarray(dataPtr, dataPtr + bufferSize));
      } finally {
        const ptrPtr = module._malloc(4);
        module.setValue(ptrPtr, bufferObjPtr, 'i32');
        module.buffer_unref(ptrPtr);
        module._free(ptrPtr);
      }
    } finally {
      module._free(bufferPtr);
    }
  }

  public readSignedInt(): BigInt {
    const module = getModule();
    const valuePtr = module._malloc(8);
    try {
      const result = module.cbor_reader_read_int(this.ptr, valuePtr);
      if (result !== 0) {
        const errorMsg = `Failed to read integer: ${getErrorString(result)} ${this.getLastError()}`;
        throw new Error(errorMsg);
      }
      return readI64(valuePtr, true);
    } finally {
      module._free(valuePtr);
    }
  }

  public readUnsignedInt(): BigInt {
    const module = getModule();
    const valuePtr = module._malloc(8);
    try {
      const result = module.cbor_reader_read_uint(this.ptr, valuePtr);
      if (result !== 0) {
        const errorMsg = `Failed to read integer: ${getErrorString(result)} ${this.getLastError()}`;
        throw new Error(errorMsg);
      }
      return readI64(valuePtr, false);
    } finally {
      module._free(valuePtr);
    }
  }

  public readBigInt(): BigInt {
    const module = getModule();
    const bigintPtrPtr = module._malloc(4);

    try {
      const result = module.cbor_reader_read_bigint(this.ptr, bigintPtrPtr);
      if (result !== 0) {
        const errorMsg = `Failed to read bigint: ${getErrorString(result)} ${this.getLastError()}`;
        throw new Error(errorMsg);
      }

      const bigintPtr = module.getValue(bigintPtrPtr, '*');

      if (!bigintPtr) {
        throw new Error('Failed to retrieve bigint pointer.');
      }

      const stringSize = module.bigint_get_string_size(bigintPtr, 10);

      if (stringSize === 0) {
        throw new Error('Failed to determine the string size of the bigint.');
      }

      const stringBuffer = module._malloc(stringSize);

      try {
        const stringResult = module.bigint_to_string(bigintPtr, stringBuffer, stringSize, 10);

        if (stringResult !== 0) {
          const errorMsg = `Failed to convert bigint to string: ${getErrorString(stringResult)}`;
          throw new Error(errorMsg);
        }

        const bigintString = getModule().UTF8ToString(stringBuffer);

        return BigInt(bigintString);
      } finally {
        module._free(stringBuffer);
      }
    } finally {
      const bigintPtr = module.getValue(bigintPtrPtr, '*');

      if (bigintPtr) {
        module.bigint_unref(bigintPtr);
      }

      module._free(bigintPtrPtr);
    }
  }

  public readDouble(): number {
    const module = getModule();
    const valuePtr = module._malloc(8);

    try {
      const result = module.cbor_reader_read_double(this.ptr, valuePtr);

      if (result !== 0) {
        const errorMsg = `Failed to read double: ${getErrorString(result)} ${this.getLastError()}`;
        throw new Error(errorMsg);
      }

      return module.getValue(valuePtr, 'double');
    } finally {
      module._free(valuePtr);
    }
  }

  public readSimpleValue(): CborSimpleValue | number {
    const module = getModule();
    const valuePtr = module._malloc(4);

    try {
      const result = module.cbor_reader_read_simple_value(this.ptr, valuePtr);

      if (result !== 0) {
        const errorMsg = `Failed to read simple value: ${getErrorString(result)} ${this.getLastError()}`;
        throw new Error(errorMsg);
      }

      const simpleValue = module.getValue(valuePtr, 'i32');

      switch (simpleValue) {
        case CborSimpleValue.False:
        case CborSimpleValue.True:
        case CborSimpleValue.Null:
        case CborSimpleValue.Undefined:
          return simpleValue as CborSimpleValue;
        default:
          return simpleValue;
      }
    } finally {
      module._free(valuePtr);
    }
  }

  public readStartMap(): number {
    const module = getModule();
    const sizePtr = module._malloc(8);

    try {
      const result = module.cbor_reader_read_start_map(this.ptr, sizePtr);

      if (result !== 0) {
        const errorMsg = `Failed to read start map: ${getErrorString(result)} ${this.getLastError()}`;
        throw new Error(errorMsg);
      }

      return Number(readI64(sizePtr, true));
    } finally {
      module._free(sizePtr);
    }
  }

  public readEndMap(): void {
    const module = getModule();

    const result = module.cbor_reader_read_end_map(this.ptr);

    if (result !== 0) {
      const errorMsg = `Failed to read end map: ${getErrorString(result)} ${this.getLastError()}`;
      throw new Error(errorMsg);
    }
  }

  public readStartArray(): number {
    const module = getModule();
    const sizePtr = module._malloc(8);

    try {
      const result = module.cbor_reader_read_start_array(this.ptr, sizePtr);

      if (result !== 0) {
        const errorMsg = `Failed to read start array: ${getErrorString(result)} ${this.getLastError()}`;
        throw new Error(errorMsg);
      }

      return Number(readI64(sizePtr, true));
    } finally {
      module._free(sizePtr);
    }
  }

  public readEndArray(): void {
    const module = getModule();

    const result = module.cbor_reader_read_end_array(this.ptr);

    if (result !== 0) {
      const errorMsg = `Failed to read end array: ${getErrorString(result)} ${this.getLastError()}`;
      throw new Error(errorMsg);
    }
  }

  public readBoolean(): boolean {
    const module = getModule();
    const boolPtr = module._malloc(1);
    try {
      const result = module.cbor_reader_read_bool(this.ptr, boolPtr);
      if (result !== 0) {
        const errorMsg = `Failed to read boolean: ${getErrorString(result)} ${this.getLastError()}`;
        throw new Error(errorMsg);
      }
      return !!module.getValue(boolPtr, 'i8');
    } finally {
      module._free(boolPtr);
    }
  }

  public readNull(): void {
    const result = getModule().cbor_reader_read_null(this.ptr);
    if (result !== 0) {
      const errorMsg = `Failed to read null: ${getErrorString(result)} ${this.getLastError()}`;
      throw new Error(errorMsg);
    }
  }

  public readByteString(): Uint8Array {
    const module = getModule();
    const bufferPtr = module._malloc(4);

    try {
      const result = module.cbor_reader_read_bytestring(this.ptr, bufferPtr);

      if (result !== 0) {
        const errorMsg = `Failed to read the bytestring: ${getErrorString(result)} ${this.getLastError()}`;
        throw new Error(errorMsg);
      }

      const bufferObjPtr = module.getValue(bufferPtr, 'i32');

      if (!bufferObjPtr) {
        throw new Error('Failed to retrieve remainder bytes: Buffer pointer is NULL.');
      }

      try {
        const bufferSize = module.buffer_get_size(bufferObjPtr);
        const dataPtr = module.buffer_get_data(bufferObjPtr);

        return new Uint8Array(module.HEAPU8.subarray(dataPtr, dataPtr + bufferSize));
      } finally {
        const ptrPtr = module._malloc(4);
        module.setValue(ptrPtr, bufferObjPtr, 'i32');
        module.buffer_unref(ptrPtr);
        module._free(ptrPtr);
      }
    } finally {
      module._free(bufferPtr);
    }
  }

  public readTextString(): string {
    const module = getModule();
    const bufferPtr = module._malloc(4);

    try {
      const result = module.cbor_reader_read_textstring(this.ptr, bufferPtr);

      if (result !== 0) {
        const errorMsg = `Failed to read the text string: ${getErrorString(result)} ${this.getLastError()}`;
        throw new Error(errorMsg);
      }

      const bufferObjPtr = module.getValue(bufferPtr, 'i32');
      if (!bufferObjPtr) {
        throw new Error('Failed to retrieve text string: Buffer pointer is NULL.');
      }

      try {
        const bufferSize = module.buffer_get_size(bufferObjPtr);
        const dataPtr = module.buffer_get_data(bufferObjPtr);

        return module.UTF8ToString(dataPtr, bufferSize);
      } finally {
        const ptrPtr = module._malloc(4);
        module.setValue(ptrPtr, bufferObjPtr, 'i32');
        module.buffer_unref(ptrPtr);
        module._free(ptrPtr);
      }
    } finally {
      module._free(bufferPtr);
    }
  }

  public readTag(): CborTag {
    const module = getModule();
    const tagPtr = module._malloc(4);

    try {
      const result = module.cbor_reader_read_tag(this.ptr, tagPtr);

      if (result !== 0) {
        const errorMsg = `Failed to read the CBOR tag: ${getErrorString(result)} ${this.getLastError()}`;
        throw new Error(errorMsg);
      }

      const tagValue = module.getValue(tagPtr, 'i32');

      return tagValue as CborTag;
    } finally {
      module._free(tagPtr);
    }
  }

  public peekTag(): CborTag {
    const module = getModule();
    const tagPtr = module._malloc(4);

    try {
      const result = module.cbor_reader_peek_tag(this.ptr, tagPtr);

      if (result !== 0) {
        const errorMsg = `Failed to read the CBOR tag: ${getErrorString(result)} ${this.getLastError()}`;
        throw new Error(errorMsg);
      }

      const tagValue = module.getValue(tagPtr, 'i32');

      return tagValue as CborTag;
    } finally {
      module._free(tagPtr);
    }
  }

  public getLastError(): string {
    const module = getModule();
    const errorPtr = module.cbor_reader_get_last_error(this.ptr);
    return errorPtr ? module.UTF8ToString(errorPtr) : 'Unknown error';
  }

  public getRefCount(): number {
    return getModule().cbor_reader_refcount(this.ptr);
  }
}
