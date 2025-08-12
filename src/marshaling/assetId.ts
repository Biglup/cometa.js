import { assertSuccess, unrefObject } from './object';
import { getModule } from '../module';
import { writeStringToMemory } from './string';

/**
 * Creates an asset ID from a byte array.
 *
 * This function converts a byte array representation of an asset ID into a
 * pointer to an asset ID object in WASM memory.
 *
 * @param {Uint8Array} assetIdHex - The raw bytes of the asset ID.
 * @returns {number} - A pointer to the created asset ID object in WASM memory.
 * @throws {Error} - Throws an error if the operation fails.
 */
export const writeAssetId = (assetIdHex: string): number => {
  const module = getModule();
  const assetIdPtrPtr = module._malloc(4);
  let assetIdPtr = 0;

  const hexStrPtr = writeStringToMemory(assetIdHex);

  try {
    const result = module.asset_id_from_hex(hexStrPtr, assetIdHex.length, assetIdPtrPtr);
    assertSuccess(result, `Failed to create asset_id from hex: ${assetIdHex}`);
    assetIdPtr = module.getValue(assetIdPtrPtr, 'i32');

    const finalPtr = assetIdPtr;
    assetIdPtr = 0; // Transfer ownership to caller
    return finalPtr;
  } catch (error) {
    if (assetIdPtr !== 0) unrefObject(assetIdPtr);
    throw error;
  } finally {
    module._free(hexStrPtr);
    module._free(assetIdPtrPtr);
  }
};
