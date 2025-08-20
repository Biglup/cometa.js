/**
 * Copyright 2025 Biglup Labs.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may not use this file except in compliance with the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* IMPORTS *******************************************************************/

import { AccountDerivationPath, DerivationPath } from '../keyHandlers';
import { Ed25519PublicKey, Ed25519Signature, VkeyWitness, VkeyWitnessSet, splitToLowHigh64bit, CborReader } from '../';
import { assertSuccess, unrefObject } from './object';
import { getModule } from '../module';

/* INTERNAL HELPERS ********************************************************/

/**
 * @hidden
 * Deserializes a native C `cardano_vkey_witness_t` into a JavaScript `VkeyWitness` object.
 *
 * @param {number} ptr - A pointer to the native `cardano_vkey_witness_t` object.
 * @returns {VkeyWitness} The deserialized JavaScript `VkeyWitness` object.
 */
const readVkeyWitness = (ptr: number): VkeyWitness => {
  let vkeyPtr = 0;
  let signaturePtr = 0;

  vkeyPtr = getModule().vkey_witness_get_vkey(ptr);
  if (!vkeyPtr) {
    throw new Error('Failed to get vkey from vkey_witness');
  }

  const key = new Ed25519PublicKey(vkeyPtr);

  signaturePtr = getModule().vkey_witness_get_signature(ptr);
  if (!signaturePtr) {
    throw new Error('Failed to get signature from vkey_witness');
  }

  const sig = new Ed25519Signature(signaturePtr);
  return {
    signature: sig.toHex(),
    vkey: key.toHex()
  };
};

/**
 * @hidden
 * Serializes a JavaScript `VkeyWitness` object into a native C `cardano_vkey_witness_t`.
 *
 * @param {VkeyWitness} witness - The `VkeyWitness` object to serialize.
 * @returns {number} A pointer to the newly created native `cardano_vkey_witness_t` object.
 */
const writeVkeyWitness = (witness: VkeyWitness): number => {
  const module = getModule();
  const witnessPtrPtr = module._malloc(4);
  const sig = Ed25519Signature.fromHex(witness.signature);
  const vkey = Ed25519PublicKey.fromHex(witness.vkey);

  try {
    assertSuccess(module.vkey_witness_new(vkey.ptr, sig.ptr, witnessPtrPtr), 'Failed to create new VkeyWitness');
    return module.getValue(witnessPtrPtr, 'i32');
  } finally {
    module._free(witnessPtrPtr);
  }
};

/* EXPORTS *******************************************************************/

/**
 * Deserializes a native C `cardano_vkey_witness_set_t` into a JavaScript `VkeyWitnessSet` array.
 *
 * @param {number} setPtr - A pointer to the native `cardano_vkey_witness_set_t` object.
 * @returns {VkeyWitnessSet} The deserialized JavaScript array of `VkeyWitness` objects.
 */
export const readVkeyWitnessSet = (setPtr: number): VkeyWitnessSet => {
  const module = getModule();
  const result: VkeyWitnessSet = [];
  const length = module.vkey_witness_set_get_length(setPtr);

  for (let i = 0; i < length; i++) {
    const witnessPtrPtr = module._malloc(4);
    let witnessPtr = 0;

    try {
      assertSuccess(module.vkey_witness_set_get(setPtr, i, witnessPtrPtr), `Failed to get vkey_witness at index ${i}`);
      witnessPtr = module.getValue(witnessPtrPtr, 'i32');
      result.push(readVkeyWitness(witnessPtr));
    } finally {
      if (witnessPtr) unrefObject(witnessPtr);
      module._free(witnessPtrPtr);
    }
  }

  return result;
};

/**
 * @hidden
 * Serializes a JavaScript `VkeyWitnessSet` array into a native C `cardano_vkey_witness_set_t`.
 *
 * @param {VkeyWitnessSet} set - The array of `VkeyWitness` objects to serialize.
 * @returns {number} A pointer to the newly created native `cardano_vkey_witness_set_t` object.
 */
export const writeVkeyWitnessSet = (set: VkeyWitnessSet): number => {
  const module = getModule();
  const setPtrPtr = module._malloc(4);
  let setPtr = 0;

  try {
    assertSuccess(module.vkey_witness_set_new(setPtrPtr), 'Failed to create vkey_witness_set');
    setPtr = module.getValue(setPtrPtr, 'i32');

    for (const witness of set) {
      const witnessPtr = writeVkeyWitness(witness);
      try {
        assertSuccess(module.vkey_witness_set_add(setPtr, witnessPtr), 'Failed to add vkey_witness to set');
      } finally {
        unrefObject(witnessPtr);
      }
    }

    return setPtr;
  } catch (error) {
    if (setPtr) unrefObject(setPtr);
    throw error;
  } finally {
    module._free(setPtrPtr);
  }
};

/**
 * @hidden
 * Serializes an array of JavaScript `DerivationPath` objects into a C-style array
 * of `cardano_derivation_path_t` structs in WASM memory.
 *
 * @param {DerivationPath[]} paths - The array of derivation path objects to serialize.
 * @returns {number} A pointer to the start of the allocated memory block for the C array.
 * The caller is responsible for freeing this memory using `module._free()`.
 */
export const writeDerivationPaths = (paths: DerivationPath[]): number => {
  const module = getModule();

  const structSize = 40;
  const totalSize = paths.length * structSize;

  if (totalSize === 0) {
    return 0;
  }

  const pathsPtr = module._malloc(totalSize);
  if (pathsPtr === 0) {
    throw new Error('Failed to allocate memory for derivation paths.');
  }

  try {
    for (const [i, path] of paths.entries()) {
      const currentOffset = pathsPtr + i * structSize;

      const purposeParts = splitToLowHigh64bit(path.purpose);
      module.setValue(currentOffset + 0, purposeParts.low, 'i32');
      module.setValue(currentOffset + 4, purposeParts.high, 'i32');

      const coinTypeParts = splitToLowHigh64bit(path.coinType);
      module.setValue(currentOffset + 8, coinTypeParts.low, 'i32');
      module.setValue(currentOffset + 12, coinTypeParts.high, 'i32');

      const accountParts = splitToLowHigh64bit(path.account);
      module.setValue(currentOffset + 16, accountParts.low, 'i32');
      module.setValue(currentOffset + 20, accountParts.high, 'i32');

      const roleParts = splitToLowHigh64bit(path.role);
      module.setValue(currentOffset + 24, roleParts.low, 'i32');
      module.setValue(currentOffset + 28, roleParts.high, 'i32');

      const indexParts = splitToLowHigh64bit(path.index);
      module.setValue(currentOffset + 32, indexParts.low, 'i32');
      module.setValue(currentOffset + 36, indexParts.high, 'i32');
    }

    return pathsPtr;
  } catch (error) {
    module._free(pathsPtr);
    throw error;
  }
};

/**
 * @hidden
 * Serializes a JavaScript `AccountDerivationPath` object into a C-style struct
 * @param path - The `AccountDerivationPath` object to serialize.
 *
 * @return {number} A pointer to the start of the allocated memory block for the C struct.
 */
export const writeAccountDerivationPaths = (path: AccountDerivationPath): number => {
  const module = getModule();

  const structSize = 40;

  const pathsPtr = module._malloc(structSize);

  try {
    const purposeParts = splitToLowHigh64bit(path.purpose);
    module.setValue(pathsPtr + 0, purposeParts.low, 'i32');
    module.setValue(pathsPtr + 4, purposeParts.high, 'i32');

    const coinTypeParts = splitToLowHigh64bit(path.coinType);
    module.setValue(pathsPtr + 8, coinTypeParts.low, 'i32');
    module.setValue(pathsPtr + 12, coinTypeParts.high, 'i32');

    const accountParts = splitToLowHigh64bit(path.account);
    module.setValue(pathsPtr + 16, accountParts.low, 'i32');
    module.setValue(pathsPtr + 20, accountParts.high, 'i32');

    return pathsPtr;
  } catch (error) {
    module._free(pathsPtr);
    throw error;
  }
};

/**
 * @hidden
 * Deserializes a vkey witness set from its CBOR hex string representation into a Value object.
 *
 * @param {string} vkeyWitnessSetCbor - The CBOR representation of the vkey witness set, encoded as a hexadecimal string.
 * @returns {number} A pointer to the newly created vkey witness set object in WASM memory.
 * @throws {Error} Throws an error if the deserialization fails, including a descriptive message from the CBOR parser.
 */
export const readVkeyWitnessSetFromCbor = (vkeyWitnessSetCbor: string): VkeyWitnessSet => {
  const module = getModule();

  const cborReader = CborReader.fromHex(vkeyWitnessSetCbor);
  const valuePtrPtr = module._malloc(4);
  let valuePtr = 0;

  try {
    const result = module.vkey_witness_set_from_cbor(cborReader.ptr, valuePtrPtr);

    if (result !== 0) {
      const error = cborReader.getLastError();
      throw new Error(`Failed to unmarshal transaction from CBOR: ${error}`);
    }

    valuePtr = module.getValue(valuePtrPtr, 'i32');
    return readVkeyWitnessSet(valuePtr);
  } finally {
    unrefObject(valuePtr);
    module._free(valuePtrPtr);
  }
};
