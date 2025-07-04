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

/* IMPORTS *******************************************************************/

import { ConstrPlutusData, PlutusData, PlutusList, PlutusMap } from '../common';
import { assertSuccess, unrefObject } from './object';
import { getModule } from '../module';
import { splitToLowHigh64bit } from './number';
import { writeBytesToMemory, writeStringToMemory } from './string';

/* DEFINITIONS ****************************************************************/

export const readPlutusData = (ptr: number): PlutusData => {
  const module = getModule();
  const kindPtr = module._malloc(4);

  try {
    assertSuccess(module.plutus_data_get_kind(ptr, kindPtr), 'Failed to get PlutusData kind');
    const kind = module.getValue(kindPtr, 'i32');

    switch (kind) {
      //================================================================================
      // Case 0: ConstrPlutusData
      //================================================================================
      case 0: {
        const constrPtrPtr = module._malloc(4);
        let constrPtr = 0;
        try {
          assertSuccess(module.plutus_data_to_constr(ptr, constrPtrPtr));
          constrPtr = module.getValue(constrPtrPtr, 'i32');

          const alternativePtr = module._malloc(8);
          const fieldsListPtrPtr = module._malloc(4);
          let fieldsListPtr = 0;
          try {
            assertSuccess(module.constr_plutus_data_get_alternative(constrPtr, alternativePtr));
            const low = module.getValue(alternativePtr, 'i32');
            const high = module.getValue(alternativePtr + 4, 'i32');
            const constructor = (BigInt(high >>> 0) << 32n) | BigInt(low >>> 0);

            assertSuccess(module.constr_plutus_data_get_data(constrPtr, fieldsListPtrPtr));
            fieldsListPtr = module.getValue(fieldsListPtrPtr, 'i32');

            // Wrap the list in a temporary generic object for the recursive call
            const tempListDataPtrPtr = module._malloc(4);
            let tempListDataPtr = 0;
            try {
              assertSuccess(module.plutus_data_new_list(fieldsListPtr, tempListDataPtrPtr));
              tempListDataPtr = module.getValue(tempListDataPtrPtr, 'i32');
              const fields = readPlutusData(tempListDataPtr) as PlutusList;
              return { constructor, fields };
            } finally {
              // Clean up the temporary wrapper
              if (tempListDataPtr) unrefObject(tempListDataPtr);
              module._free(tempListDataPtrPtr);
            }
          } finally {
            // Clean up resources from this scope
            module._free(alternativePtr);
            // THIS IS THE FIX: Clean up the reference to the fields list
            if (fieldsListPtr) unrefObject(fieldsListPtr);
            module._free(fieldsListPtrPtr);
          }
        } finally {
          if (constrPtr) unrefObject(constrPtr);
          module._free(constrPtrPtr);
        }
      }

      //================================================================================
      // Case 1: PlutusMap
      //================================================================================
      case 1: {
        const mapPtrPtr = module._malloc(4);
        let mapPtr = 0;
        try {
          assertSuccess(module.plutus_data_to_map(ptr, mapPtrPtr));
          mapPtr = module.getValue(mapPtrPtr, 'i32');

          const keysListPtrPtr = module._malloc(4);
          const valuesListPtrPtr = module._malloc(4);
          let keysListPtr = 0;
          let valuesListPtr = 0;
          try {
            assertSuccess(module.plutus_map_get_keys(mapPtr, keysListPtrPtr));
            keysListPtr = module.getValue(keysListPtrPtr, 'i32');

            assertSuccess(module.plutus_map_get_values(mapPtr, valuesListPtrPtr));
            valuesListPtr = module.getValue(valuesListPtrPtr, 'i32');

            const length = module.plutus_list_get_length(keysListPtr);
            const entries: Array<{ key: PlutusData; value: PlutusData }> = [];

            for (let i = 0; i < length; i++) {
              const keyDataPtrPtr = module._malloc(4);
              const valueDataPtrPtr = module._malloc(4);
              try {
                // Get the pointer for the key at the current index
                assertSuccess(module.plutus_list_get(keysListPtr, i, keyDataPtrPtr));
                const keyDataPtr = module.getValue(keyDataPtrPtr, 'i32');

                // Get the pointer for the value at the current index
                assertSuccess(module.plutus_list_get(valuesListPtr, i, valueDataPtrPtr));
                const valueDataPtr = module.getValue(valueDataPtrPtr, 'i32');

                // Recursive calls to read the key and value
                const key = readPlutusData(keyDataPtr);
                const value = readPlutusData(valueDataPtr);
                entries.push({ key, value });

                // Clean up the key/value data objects for this iteration
                unrefObject(keyDataPtr);
                unrefObject(valueDataPtr);
              } finally {
                module._free(keyDataPtrPtr);
                module._free(valueDataPtrPtr);
              }
            }
            return { entries };
          } finally {
            // THIS IS THE FIX: Clean up the key/value lists
            if (keysListPtr) unrefObject(keysListPtr);
            if (valuesListPtr) unrefObject(valuesListPtr);
            module._free(keysListPtrPtr);
            module._free(valuesListPtrPtr);
          }
        } finally {
          if (mapPtr) unrefObject(mapPtr);
          module._free(mapPtrPtr);
        }
      }

      //================================================================================
      // Case 2: PlutusList
      //================================================================================
      case 2: {
        const listPtrPtr = module._malloc(4);
        let listPtr = 0;
        try {
          assertSuccess(module.plutus_data_to_list(ptr, listPtrPtr));
          listPtr = module.getValue(listPtrPtr, 'i32');

          const length = module.plutus_list_get_length(listPtr);
          const items: PlutusData[] = [];
          for (let i = 0; i < length; i++) {
            const elementPtrPtr = module._malloc(4);
            try {
              // Get the pointer for the element at the current index
              assertSuccess(module.plutus_list_get(listPtr, i, elementPtrPtr));
              const elementPtr = module.getValue(elementPtrPtr, 'i32');

              // Recursive call to read the element
              items.push(readPlutusData(elementPtr));

              // Clean up the element data object for this iteration
              unrefObject(elementPtr);
            } finally {
              module._free(elementPtrPtr);
            }
          }
          return { items };
        } finally {
          if (listPtr) unrefObject(listPtr);
          module._free(listPtrPtr);
        }
      }

      //================================================================================
      // Case 3: Integer
      //================================================================================
      case 3: {
        const bigintPtrPtr = module._malloc(4);
        try {
          assertSuccess(module.plutus_data_to_integer(ptr, bigintPtrPtr));
          const bigintPtr = module.getValue(bigintPtrPtr, 'i32');
          try {
            const strSize = module.bigint_get_string_size(bigintPtr, 10);
            const strPtr = module._malloc(strSize);
            try {
              assertSuccess(module.bigint_to_string(bigintPtr, strPtr, strSize, 10));
              return BigInt(module.UTF8ToString(strPtr));
            } finally {
              module._free(strPtr);
            }
          } finally {
            unrefObject(bigintPtr);
          }
        } finally {
          module._free(bigintPtrPtr);
        }
      }

      //================================================================================
      // Case 4: Bytes
      //================================================================================
      case 4: {
        const bufferPtrPtr = module._malloc(4);
        try {
          assertSuccess(module.plutus_data_to_bounded_bytes(ptr, bufferPtrPtr));
          const bufferPtr = module.getValue(bufferPtrPtr, 'i32');
          try {
            const size = module.buffer_get_size(bufferPtr);
            const dataPtr = module.buffer_get_data(bufferPtr);
            // Create a copy of the data from the Wasm heap
            return new Uint8Array(module.HEAPU8.subarray(dataPtr, dataPtr + size));
          } finally {
            unrefObject(bufferPtr);
          }
        } finally {
          module._free(bufferPtrPtr);
        }
      }

      default:
        throw new Error(`Unknown PlutusData kind: ${kind}`);
    }
  } finally {
    module._free(kindPtr);
  }
};

export const writePlutusData = (data: PlutusData): number => {
  const module = getModule();
  let plutusDataPtr = 0;

  //================================================================================
  // Case 1: bigint
  //================================================================================
  if (typeof data === 'bigint') {
    const plutusDataPtrPtr = module._malloc(4);
    const str = data.toString(10);
    const strPtr = writeStringToMemory(str);
    try {
      assertSuccess(
        module.plutus_data_new_integer_from_string(strPtr, str.length, 10, plutusDataPtrPtr),
        'Failed to create PlutusData from integer string'
      );
      plutusDataPtr = module.getValue(plutusDataPtrPtr, 'i32');
    } finally {
      module._free(strPtr);
      module._free(plutusDataPtrPtr);
    }
    return plutusDataPtr;
  }

  //================================================================================
  // Case 2: Uint8Array (Bytes)
  //================================================================================
  if (data instanceof Uint8Array) {
    const plutusDataPtrPtr = module._malloc(4);
    const bytesPtr = writeBytesToMemory(data);
    try {
      assertSuccess(
        module.plutus_data_new_bytes(bytesPtr, data.length, plutusDataPtrPtr),
        'Failed to create PlutusData from bytes'
      );
      plutusDataPtr = module.getValue(plutusDataPtrPtr, 'i32');
    } finally {
      module._free(bytesPtr);
      module._free(plutusDataPtrPtr);
    }
    return plutusDataPtr;
  }

  // The remaining types are all objects
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid PlutusData type');
  }

  //================================================================================
  // Case 3: ConstrPlutusData
  //================================================================================
  if ('constructor' in data && 'fields' in data) {
    const constr = data as ConstrPlutusData;
    let fieldsListPtr = 0;
    let constrPtr = 0;

    const fieldsListPtrPtr = module._malloc(4);
    try {
      // Create the C object for the fields list
      assertSuccess(
        module.plutus_list_new(fieldsListPtrPtr),
        'writePlutusData: Failed to create new list for Constr fields'
      );
      fieldsListPtr = module.getValue(fieldsListPtrPtr, 'i32');

      // Recursively write each field and add it to the C list
      for (const field of constr.fields.items) {
        const fieldPtr = writePlutusData(field); // Recursive call
        assertSuccess(module.plutus_list_add(fieldsListPtr, fieldPtr));
        // The list now owns the reference, so we can release our local one
        unrefObject(fieldPtr);
      }

      // Create the C object for the constructor data
      const constrPtrPtr = module._malloc(4);
      try {
        const constrParts = splitToLowHigh64bit(constr.constructor);
        assertSuccess(
          module.constr_plutus_data_new(constrParts.low, constrParts.high, fieldsListPtr, constrPtrPtr),
          'writePlutusData: Failed to create ConstrPlutusData'
        );
        constrPtr = module.getValue(constrPtrPtr, 'i32');
      } finally {
        module._free(constrPtrPtr);
      }

      // Finally, wrap the constructor object in a generic PlutusData handle
      const plutusDataPtrPtr = module._malloc(4);
      try {
        assertSuccess(module.plutus_data_new_constr(constrPtr, plutusDataPtrPtr));
        plutusDataPtr = module.getValue(plutusDataPtrPtr, 'i32');
      } finally {
        module._free(plutusDataPtrPtr);
      }
    } finally {
      // Clean up all intermediate C objects
      module._free(fieldsListPtrPtr);
      if (fieldsListPtr) unrefObject(fieldsListPtr);
      if (constrPtr) unrefObject(constrPtr);
    }
    return plutusDataPtr;
  }

  //================================================================================
  // Case 4: PlutusMap
  //================================================================================
  if ('entries' in data) {
    const map = data as PlutusMap;
    let mapPtr = 0;

    const mapPtrPtr = module._malloc(4);
    try {
      // Create the C object for the map
      assertSuccess(module.plutus_map_new(mapPtrPtr), 'writePlutusData: Failed to create new PlutusMap');
      mapPtr = module.getValue(mapPtrPtr, 'i32');

      // Recursively write each key/value pair and insert it into the C map
      for (const pair of map.entries) {
        const keyPtr = writePlutusData(pair.key); // Recursive call
        const valuePtr = writePlutusData(pair.value); // Recursive call
        assertSuccess(module.plutus_map_insert(mapPtr, keyPtr, valuePtr));
        // The map now owns the references, release our local ones
        unrefObject(keyPtr);
        unrefObject(valuePtr);
      }

      // Wrap the map object in a generic PlutusData handle
      const plutusDataPtrPtr = module._malloc(4);
      try {
        assertSuccess(module.plutus_data_new_map(mapPtr, plutusDataPtrPtr));
        plutusDataPtr = module.getValue(plutusDataPtrPtr, 'i32');
      } finally {
        module._free(plutusDataPtrPtr);
      }
    } finally {
      // Clean up the intermediate map object
      module._free(mapPtrPtr);
      if (mapPtr) unrefObject(mapPtr);
    }
    return plutusDataPtr;
  }

  //================================================================================
  // Case 5: PlutusList
  //================================================================================
  if ('items' in data) {
    const list = data as PlutusList;
    let listPtr = 0;

    const listPtrPtr = module._malloc(4);
    try {
      // Create the C object for the list
      assertSuccess(module.plutus_list_new(listPtrPtr), 'writePlutusData: Failed to create new PlutusList');
      listPtr = module.getValue(listPtrPtr, 'i32');

      // Recursively write each item and add it to the C list
      for (const item of list.items) {
        const itemPtr = writePlutusData(item); // Recursive call
        assertSuccess(module.plutus_list_add(listPtr, itemPtr));
        // The list now owns the reference, release our local one
        unrefObject(itemPtr);
      }

      // Wrap the list object in a generic PlutusData handle
      const plutusDataPtrPtr = module._malloc(4);
      try {
        assertSuccess(module.plutus_data_new_list(listPtr, plutusDataPtrPtr));
        plutusDataPtr = module.getValue(plutusDataPtrPtr, 'i32');
      } finally {
        module._free(plutusDataPtrPtr);
      }
    } finally {
      // Clean up the intermediate list object
      module._free(listPtrPtr);
      if (listPtr) unrefObject(listPtr);
    }
    return plutusDataPtr;
  }

  throw new Error('Could not determine PlutusData type for marshalling');
};
