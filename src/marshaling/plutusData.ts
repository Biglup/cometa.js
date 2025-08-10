/* eslint-disable no-use-before-define */

import { ConstrPlutusData, PlutusData, PlutusList, PlutusMap } from '../common';
import { assertSuccess, unrefObject } from './object';
import { getModule } from '../module';
import { splitToLowHigh64bit } from './number';
import { writeBytesToMemory, writeStringToMemory } from './string';

// =============================================================================
// Writer (JS -> C) Implementations
// =============================================================================
const writeConstrPlutusData = (data: ConstrPlutusData): number => {
  const module = getModule();
  let fieldsListPtr = 0;
  let constrPtr = 0;
  try {
    // Recursively call the main dispatcher to create the list as a generic PlutusData object
    fieldsListPtr = writePlutusData(data.fields);

    // Downcast it to the specific list type the constructor needs
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
        return constrPtr; // Return the final specific constructor object
      } finally {
        module._free(constrPtrPtr);
      }
    } finally {
      if (specificListPtr) unrefObject(specificListPtr);
      module._free(specificListPtrPtr);
    }
  } finally {
    // The new constrPtr owns the list, so we only unref our local reference to the list wrapper.
    if (fieldsListPtr) unrefObject(fieldsListPtr);
    // Note: `constrPtr` is returned, so its ownership is transferred. No unref here.
  }
};

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

export const writePlutusData = (data: PlutusData): number => {
  const module = getModule();
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

// =============================================================================
// Reader (C -> JS) Implementations
// =============================================================================

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
    const fields = readPlutusList(fieldsListPtr); // Directly read the specific list type
    return { constructor, fields };
  } finally {
    module._free(alternativePtr);
    module._free(fieldsListPtrPtr);
    if (fieldsListPtr) unrefObject(fieldsListPtr);
  }
};

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
      // eslint-disable-next-line no-use-before-define
      items.push(readPlutusData(elementPtr));
    } finally {
      if (elementPtr) unrefObject(elementPtr);
      module._free(elementPtrPtr);
    }
  }
  return { items };
};

/**
 * Main dispatcher for reading PlutusData. Determines the kind and calls the appropriate helper.
 */
export const readPlutusData = (ptr: number): PlutusData => {
  const module = getModule();
  const kindPtr = module._malloc(4);
  try {
    assertSuccess(module.plutus_data_get_kind(ptr, kindPtr), 'Failed to get PlutusData kind');
    const kind = module.getValue(kindPtr, 'i32');

    let specificDataPtr = 0;
    const specificDataPtrPtr = module._malloc(4);
    try {
      switch (kind) {
        case 0: {
          assertSuccess(module.plutus_data_to_constr(ptr, specificDataPtrPtr));
          specificDataPtr = module.getValue(specificDataPtrPtr, 'i32');
          return readConstrPlutusData(specificDataPtr);
        }
        case 1: {
          assertSuccess(module.plutus_data_to_map(ptr, specificDataPtrPtr));
          specificDataPtr = module.getValue(specificDataPtrPtr, 'i32');
          return readPlutusMap(specificDataPtr);
        }
        case 2: {
          assertSuccess(module.plutus_data_to_list(ptr, specificDataPtrPtr));
          specificDataPtr = module.getValue(specificDataPtrPtr, 'i32');
          return readPlutusList(specificDataPtr);
        }
        case 3: {
          // Integer
          assertSuccess(module.plutus_data_to_integer(ptr, specificDataPtrPtr));
          specificDataPtr = module.getValue(specificDataPtrPtr, 'i32');
          const strSize = module.bigint_get_string_size(specificDataPtr, 10);
          const strPtr = module._malloc(strSize);
          try {
            assertSuccess(module.bigint_to_string(specificDataPtr, strPtr, strSize, 10));
            return BigInt(module.UTF8ToString(strPtr));
          } finally {
            module._free(strPtr);
          }
        }
        case 4: {
          // Bytes
          assertSuccess(module.plutus_data_to_bounded_bytes(ptr, specificDataPtrPtr));
          specificDataPtr = module.getValue(specificDataPtrPtr, 'i32');
          const size = module.buffer_get_size(specificDataPtr);
          const dataPtr = module.buffer_get_data(specificDataPtr);
          return new Uint8Array(module.HEAPU8.subarray(dataPtr, dataPtr + size));
        }
        default:
          throw new Error(`Unknown PlutusData kind: ${kind}`);
      }
    } finally {
      if (specificDataPtr) unrefObject(specificDataPtr);
      module._free(specificDataPtrPtr);
    }
  } finally {
    module._free(kindPtr);
  }
};
