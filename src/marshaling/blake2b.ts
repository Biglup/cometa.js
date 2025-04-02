import { assertSuccess, unrefObject } from './object';
import { getModule } from '../module';
import { hexToUint8Array } from '../cometa';

/**
 * Creates a Blake2b hash object from a byte array.
 *
 * This is the inverse operation of readBlake2bHashData, allowing you to create
 * a Blake2b hash object from raw bytes that can be used in other operations.
 *
 * @param {Uint8Array} data - The raw bytes of the Blake2b hash.
 * @returns {number} - A pointer to the created Blake2b hash object in WASM memory.
 * @throws {Error} - Throws an error if the operation fails.
 */
export const blake2bHashFromBytes = (data: Uint8Array): number => {
  const module = getModule();
  const dataPtr = module._malloc(data.length);
  const hashPtrPtr = module._malloc(4);

  try {
    module.HEAPU8.set(data, dataPtr);

    const result = module.blake2b_hash_from_bytes(dataPtr, data.length, hashPtrPtr);

    assertSuccess(result, 'Failed to create Blake2b hash from bytes');

    return module.getValue(hashPtrPtr, 'i32');
  } finally {
    module._free(dataPtr);
    module._free(hashPtrPtr);
  }
};

/**
 * Creates a Blake2b hash object from a hexadecimal string.
 *
 * This function converts a hexadecimal string representation of a Blake2b hash
 * into a Blake2b hash object that can be used in other operations.
 *
 * @param {string} hex - The hexadecimal string representation of the Blake2b hash.
 * @returns {number} - A pointer to the created Blake2b hash object in WASM memory.
 * @throws {Error} - Throws an error if the operation fails or if the hex string is invalid.
 */
export const blake2bHashFromHex = (hex: string): number => {
  const data = hexToUint8Array(hex);
  return blake2bHashFromBytes(data);
};

/**
 * Reads the data from a Blake2b hash object and returns it as a Uint8Array.
 *
 * @param bufferPtr A pointer to the Blake2b hash object in WASM memory.
 */
export const readBlake2bHashData = (bufferPtr: number): Uint8Array => {
  const module = getModule();
  const size = module.blake2b_hash_get_bytes_size(bufferPtr);
  const dataPtr = module.blake2b_hash_get_data(bufferPtr);

  try {
    return new Uint8Array(module.HEAPU8.subarray(dataPtr, dataPtr + size));
  } finally {
    unrefObject(bufferPtr);
  }
};
