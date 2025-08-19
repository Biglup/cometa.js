/* eslint-disable no-use-before-define */
/**
 * Copyright 2025 Biglup Labs.
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

/* IMPORTS *******************************************************************/

import { CborReader, CborWriter } from '../encoding';
import {
  ConstrPlutusData,
  PlutusData,
  PlutusList,
  PlutusMap,
  isPlutusDataConstr,
  isPlutusDataList,
  isPlutusDataMap,
  isPlutusDataWithCborCache
} from '../common';
import { assertSuccess, unrefObject } from './object';
import { getModule } from '../module';
import { splitToLowHigh64bit } from './number';
import { writeBytesToMemory, writeStringToMemory } from './string';

/* DEFINITIONS ****************************************************************/

/**
 * @hidden
 * Internal helper to write a `ConstrPlutusData` object to WASM memory.
 * This is called by the main `writePlutusData` dispatcher.
 *
 * @param {ConstrPlutusData} data - The constructed Plutus data object.
 * @returns {number} A pointer to the created `ConstrPlutusData` object in WASM memory.
 */
const writeConstrPlutusData = (data: ConstrPlutusData): number => {
  const module = getModule();
  let fieldsListPtr = 0;
  let constrPtr = 0;
  try {
    fieldsListPtr = writePlutusData(data.fields);

    const specificListPtrPtr = module._malloc(4);
    let specificListPtr = 0;
    try {
      assertSuccess(module.plutus_data_to_list(fieldsListPtr, specificListPtrPtr));
      specificListPtr = module.getValue(specificListPtrPtr, 'i32');

      const constrPtrPtr = module._malloc(4);
      try {
        const constrParts = splitToLowHigh64bit(data.constructor);
        assertSuccess(module.constr_plutus_data_new(constrParts.low, constrParts.high, specificListPtr, constrPtrPtr));
        constrPtr = module.getValue(constrPtrPtr, 'i32');
        return constrPtr;
      } finally {
        module._free(constrPtrPtr);
      }
    } finally {
      if (specificListPtr) unrefObject(specificListPtr);
      module._free(specificListPtrPtr);
    }
  } finally {
    if (fieldsListPtr) unrefObject(fieldsListPtr);
  }
};

/**
 * @hidden
 * Internal helper to write a `PlutusMap` object to WASM memory.
 * This is called by the main `writePlutusData` dispatcher.
 *
 * @param {PlutusMap} data - The Plutus map object.
 * @returns {number} A pointer to the created `PlutusMap` object in WASM memory.
 */
const writePlutusMap = (data: PlutusMap): number => {
  const module = getModule();
  let mapPtr = 0;
  const mapPtrPtr = module._malloc(4);
  try {
    assertSuccess(module.plutus_map_new(mapPtrPtr));
    mapPtr = module.getValue(mapPtrPtr, 'i32');
    for (const pair of data.entries) {
      let keyPtr = 0;
      let valuePtr = 0;
      try {
        keyPtr = writePlutusData(pair.key);
        valuePtr = writePlutusData(pair.value);
        assertSuccess(module.plutus_map_insert(mapPtr, keyPtr, valuePtr));
      } finally {
        if (keyPtr) unrefObject(keyPtr);
        if (valuePtr) unrefObject(valuePtr);
      }
    }
    return mapPtr;
  } finally {
    module._free(mapPtrPtr);
  }
};

/**
 * @hidden
 * Internal helper to write a `PlutusList` object to WASM memory.
 * This is called by the main `writePlutusData` dispatcher.
 *
 * @param {PlutusList} data - The Plutus list object.
 * @returns {number} A pointer to the created `PlutusList` object in WASM memory.
 */
const writePlutusList = (data: PlutusList): number => {
  const module = getModule();
  let listPtr = 0;
  const listPtrPtr = module._malloc(4);
  try {
    assertSuccess(module.plutus_list_new(listPtrPtr));
    listPtr = module.getValue(listPtrPtr, 'i32');
    for (const item of data.items) {
      let itemPtr = 0;
      try {
        itemPtr = writePlutusData(item);
        assertSuccess(module.plutus_list_add(listPtr, itemPtr));
      } finally {
        if (itemPtr) unrefObject(itemPtr);
      }
    }
    return listPtr;
  } finally {
    module._free(listPtrPtr);
  }
};

/**
 * @hidden
 * Creates a PlutusData object in WASM memory from a JavaScript representation.
 *
 * This is the main dispatcher function for writing `PlutusData`. It intelligently
 * determines the type of the input data (e.g., bigint for Integer, Uint8Array for Bytes,
 * or structured objects for Map, List, Constr) and calls the appropriate
 * serialization logic. It also handles a fast-path for objects with a cached CBOR representation.
 *
 * @param {PlutusData} data - The JavaScript representation of the Plutus data.
 * @returns {number} A pointer to the created `PlutusData` object in WASM memory.
 * @throws {Error} Throws an error if the data type is unknown or if serialization fails.
 */
// eslint-disable-next-line sonarjs/cognitive-complexity,complexity,max-statements
export const writePlutusData = (data: PlutusData): number => {
  const module = getModule();

  if (isPlutusDataWithCborCache(data) && data.cbor) {
    const cborReader = CborReader.fromHex(data.cbor);
    let dataPtr = 0;
    const dataPtrPtr = module._malloc(4);
    try {
      assertSuccess(module.plutus_data_from_cbor(cborReader.ptr, dataPtrPtr));
      dataPtr = module.getValue(dataPtrPtr, 'i32');
      const finalPtr = dataPtr;
      dataPtr = 0; // Transfer ownership
      return finalPtr;
    } catch (error) {
      if (dataPtr !== 0) unrefObject(dataPtr);
      throw error;
    } finally {
      module._free(dataPtrPtr);
    }
  }

  let specificDataPtr = 0;
  let genericDataPtr = 0;

  try {
    if (typeof data === 'bigint') {
      const genericDataPtrPtr = module._malloc(4);
      const str = data.toString(10);
      const strPtr = writeStringToMemory(str);
      try {
        assertSuccess(module.plutus_data_new_integer_from_string(strPtr, str.length, 10, genericDataPtrPtr));
        genericDataPtr = module.getValue(genericDataPtrPtr, 'i32');
      } finally {
        module._free(strPtr);
        module._free(genericDataPtrPtr);
      }
    } else if (data instanceof Uint8Array) {
      const genericDataPtrPtr = module._malloc(4);
      const bytesPtr = writeBytesToMemory(data);
      try {
        assertSuccess(module.plutus_data_new_bytes(bytesPtr, data.length, genericDataPtrPtr));
        genericDataPtr = module.getValue(genericDataPtrPtr, 'i32');
      } finally {
        module._free(bytesPtr);
        module._free(genericDataPtrPtr);
      }
    } else if (typeof data === 'object' && data !== null) {
      let wrapperFn;
      if ('constructor' in data && 'fields' in data) {
        specificDataPtr = writeConstrPlutusData(data as ConstrPlutusData);
        wrapperFn = module.plutus_data_new_constr;
      } else if ('entries' in data) {
        specificDataPtr = writePlutusMap(data as PlutusMap);
        wrapperFn = module.plutus_data_new_map;
      } else if ('items' in data) {
        specificDataPtr = writePlutusList(data as PlutusList);
        wrapperFn = module.plutus_data_new_list;
      } else {
        throw new Error('Could not determine PlutusData object type');
      }
      const genericDataPtrPtr = module._malloc(4);
      try {
        assertSuccess(wrapperFn(specificDataPtr, genericDataPtrPtr));
        genericDataPtr = module.getValue(genericDataPtrPtr, 'i32');
      } finally {
        module._free(genericDataPtrPtr);
      }
    } else {
      throw new Error('Could not determine PlutusData type for marshalling');
    }
    const finalPtr = genericDataPtr;
    genericDataPtr = 0;
    return finalPtr;
  } catch (error) {
    if (genericDataPtr !== 0) unrefObject(genericDataPtr);
    throw error;
  } finally {
    if (specificDataPtr !== 0) unrefObject(specificDataPtr);
  }
};

/**
 * @hidden
 * Internal helper to read a `ConstrPlutusData` object from WASM memory.
 * This is called by the main `readPlutusData` dispatcher.
 *
 * @param {number} constrPtr - A pointer to a `ConstrPlutusData` object.
 * @returns {ConstrPlutusData} The JavaScript representation of the constructed data.
 */
const readConstrPlutusData = (constrPtr: number): ConstrPlutusData => {
  const module = getModule();
  let fieldsListPtr = 0;
  const alternativePtr = module._malloc(8);
  const fieldsListPtrPtr = module._malloc(4);
  try {
    assertSuccess(module.constr_plutus_data_get_alternative(constrPtr, alternativePtr));
    const low = module.getValue(alternativePtr, 'i32');
    const high = module.getValue(alternativePtr + 4, 'i32');
    const constructor = (BigInt(high >>> 0) << 32n) | BigInt(low >>> 0);

    assertSuccess(module.constr_plutus_data_get_data(constrPtr, fieldsListPtrPtr));
    fieldsListPtr = module.getValue(fieldsListPtrPtr, 'i32');

    const fields = readPlutusList(fieldsListPtr);

    return { constructor, fields };
  } finally {
    module._free(alternativePtr);
    module._free(fieldsListPtrPtr);
    if (fieldsListPtr) unrefObject(fieldsListPtr);
  }
};

/**
 * @hidden
 * Internal helper to read a `PlutusMap` object from WASM memory.
 * This is called by the main `readPlutusData` dispatcher.
 *
 * @param {number} mapPtr - A pointer to a `PlutusMap` object.
 * @returns {PlutusMap} The JavaScript representation of the Plutus map.
 */
// eslint-disable-next-line max-statements
const readPlutusMap = (mapPtr: number): PlutusMap => {
  const module = getModule();
  let keysListPtr = 0;
  let valuesListPtr = 0;
  const keysListPtrPtr = module._malloc(4);
  const valuesListPtrPtr = module._malloc(4);
  try {
    assertSuccess(module.plutus_map_get_keys(mapPtr, keysListPtrPtr));
    keysListPtr = module.getValue(keysListPtrPtr, 'i32');

    assertSuccess(module.plutus_map_get_values(mapPtr, valuesListPtrPtr));
    valuesListPtr = module.getValue(valuesListPtrPtr, 'i32');

    const length = module.plutus_list_get_length(keysListPtr);
    const entries: Array<{ key: PlutusData; value: PlutusData }> = [];

    for (let i = 0; i < length; i++) {
      let keyDataPtr = 0;
      let valueDataPtr = 0;
      const keyDataPtrPtr = module._malloc(4);
      const valueDataPtrPtr = module._malloc(4);
      try {
        assertSuccess(module.plutus_list_get(keysListPtr, i, keyDataPtrPtr));
        keyDataPtr = module.getValue(keyDataPtrPtr, 'i32');

        assertSuccess(module.plutus_list_get(valuesListPtr, i, valueDataPtrPtr));
        valueDataPtr = module.getValue(valueDataPtrPtr, 'i32');

        entries.push({
          // eslint-disable-next-line no-use-before-define
          key: readPlutusData(keyDataPtr),
          // eslint-disable-next-line no-use-before-define
          value: readPlutusData(valueDataPtr)
        });
      } finally {
        if (keyDataPtr) unrefObject(keyDataPtr);
        if (valueDataPtr) unrefObject(valueDataPtr);
        module._free(keyDataPtrPtr);
        module._free(valueDataPtrPtr);
      }
    }
    return { entries };
  } finally {
    if (keysListPtr) unrefObject(keysListPtr);
    if (valuesListPtr) unrefObject(valuesListPtr);
    module._free(keysListPtrPtr);
    module._free(valuesListPtrPtr);
  }
};

/**
 * @hidden
 * Internal helper to read a `PlutusList` object from WASM memory.
 * This is called by the main `readPlutusData` dispatcher.
 *
 * @param {number} listPtr - A pointer to a `PlutusList` object.
 * @returns {PlutusList} The JavaScript representation of the Plutus list.
 */
const readPlutusList = (listPtr: number): PlutusList => {
  const module = getModule();
  const length = module.plutus_list_get_length(listPtr);
  const items: PlutusData[] = [];
  for (let i = 0; i < length; i++) {
    let elementPtr = 0;
    const elementPtrPtr = module._malloc(4);
    try {
      assertSuccess(module.plutus_list_get(listPtr, i, elementPtrPtr));
      elementPtr = module.getValue(elementPtrPtr, 'i32');
      items.push(readPlutusData(elementPtr)); // This is a correct recursive call
    } finally {
      if (elementPtr) unrefObject(elementPtr);
      module._free(elementPtrPtr);
    }
  }
  return { items };
};

/**
 * @hidden
 * Reads a PlutusData object from WASM memory and converts it into its JavaScript representation.
 *
 * This is the main dispatcher function for reading `PlutusData`. It determines the
 * kind of the data at the given pointer (e.g., Map, List, Integer, etc.) and then
 * calls the appropriate deserialization logic to reconstruct the JavaScript object or primitive.
 * For structured types (List, Map, Constr), it also enriches the returned object with its CBOR hex string.
 *
 * @param {number} ptr - A pointer to the `PlutusData` object in WASM memory.
 * @returns {PlutusData} The JavaScript representation of the Plutus data.
 * @throws {Error} Throws an error if the data kind is unknown or if deserialization fails.
 */
// eslint-disable-next-line max-statements
export const readPlutusData = (ptr: number): PlutusData => {
  const module = getModule();
  const kindPtr = module._malloc(4);
  try {
    assertSuccess(module.plutus_data_get_kind(ptr, kindPtr), 'Failed to get PlutusData kind');
    const kind = module.getValue(kindPtr, 'i32');

    let parsedData: PlutusData;
    let specificDataPtr = 0;
    const specificDataPtrPtr = module._malloc(4);
    try {
      // 1. Determine the kind and parse the specific data structure
      switch (kind) {
        case 0: {
          // ConstrPlutusData
          assertSuccess(module.plutus_data_to_constr(ptr, specificDataPtrPtr));
          specificDataPtr = module.getValue(specificDataPtrPtr, 'i32');
          parsedData = readConstrPlutusData(specificDataPtr);
          break;
        }
        case 1: {
          // PlutusMap
          assertSuccess(module.plutus_data_to_map(ptr, specificDataPtrPtr));
          specificDataPtr = module.getValue(specificDataPtrPtr, 'i32');
          parsedData = readPlutusMap(specificDataPtr);
          break;
        }
        case 2: {
          // PlutusList
          assertSuccess(module.plutus_data_to_list(ptr, specificDataPtrPtr));
          specificDataPtr = module.getValue(specificDataPtrPtr, 'i32');
          parsedData = readPlutusList(specificDataPtr);
          break;
        }
        case 3: {
          // Integer
          assertSuccess(module.plutus_data_to_integer(ptr, specificDataPtrPtr));
          specificDataPtr = module.getValue(specificDataPtrPtr, 'i32');
          const strSize = module.bigint_get_string_size(specificDataPtr, 10);
          const strPtr = module._malloc(strSize);
          try {
            assertSuccess(module.bigint_to_string(specificDataPtr, strPtr, strSize, 10));
            parsedData = BigInt(module.UTF8ToString(strPtr));
          } finally {
            module._free(strPtr);
          }
          break;
        }
        case 4: {
          // Bytes
          assertSuccess(module.plutus_data_to_bounded_bytes(ptr, specificDataPtrPtr));
          specificDataPtr = module.getValue(specificDataPtrPtr, 'i32');
          const size = module.buffer_get_size(specificDataPtr);
          const dataPtr = module.buffer_get_data(specificDataPtr);
          parsedData = new Uint8Array(module.HEAPU8.subarray(dataPtr, dataPtr + size));
          break;
        }
        default:
          throw new Error(`Unknown PlutusData kind: ${kind}`);
      }
    } finally {
      if (specificDataPtr) unrefObject(specificDataPtr);
      module._free(specificDataPtrPtr);
    }

    if (isPlutusDataList(parsedData) || isPlutusDataMap(parsedData) || isPlutusDataConstr(parsedData)) {
      const cborWriter = new CborWriter();
      assertSuccess(getModule().plutus_data_to_cbor(ptr, cborWriter.ptr));
      parsedData.cbor = cborWriter.encodeHex();
    }

    return parsedData;
  } finally {
    module._free(kindPtr);
  }
};
