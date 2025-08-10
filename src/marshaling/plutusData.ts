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

// New dedicated helper function for writing a PlutusList
const writePlutusList = (list: PlutusList): number => {
  const module = getModule();
  let listPtr = 0;
  let listPtrPtr = 0;

  try {
    listPtrPtr = module._malloc(4);
    assertSuccess(module.plutus_list_new(listPtrPtr));
    listPtr = module.getValue(listPtrPtr, 'i32');
    module._free(listPtrPtr);
    listPtrPtr = 0;

    for (const item of list.items) {
      const itemPtr = writePlutusData(item); // Recursive call
      try {
        assertSuccess(module.plutus_list_add(listPtr, itemPtr));
      } finally {
        unrefObject(itemPtr); // List now owns the reference
      }
    }

    const finalPtr = listPtr;
    listPtr = 0; // Transfer ownership
    return finalPtr;

  } catch (error) {
    if (listPtr !== 0) unrefObject(listPtr);
    console.error('Failed to write PlutusList:', error);
    throw error;
  } finally {
    if (listPtrPtr !== 0) module._free(listPtrPtr);
  }
};

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
        console.log(`[DEBUG] Reading ConstrPlutusData at ptr: ${ptr}`);
        const constrPtrPtr = module._malloc(4);
        let constrPtr = 0;
        let fieldsListPtr = 0;
        try {
          assertSuccess(module.plutus_data_to_constr(ptr, constrPtrPtr));
          constrPtr = module.getValue(constrPtrPtr, 'i32');
          console.log(`[DEBUG]   -> Got constrPtr: ${constrPtr}`);

          const alternativePtr = module._malloc(8);
          const fieldsListPtrPtr = module._malloc(4);
          try {
            assertSuccess(module.constr_plutus_data_get_alternative(constrPtr, alternativePtr));
            const low = module.getValue(alternativePtr, 'i32');
            const high = module.getValue(alternativePtr + 4, 'i32');
            const constructor = (BigInt(high >>> 0) << 32n) | BigInt(low >>> 0);
            console.log(`[DEBUG]   -> Read constructor tag: ${constructor}`);

            assertSuccess(module.constr_plutus_data_get_data(constrPtr, fieldsListPtrPtr));
            fieldsListPtr = module.getValue(fieldsListPtrPtr, 'i32');
            console.log(`[DEBUG]   -> Got fieldsListPtr: ${fieldsListPtr}`);

            // THIS IS THE CRITICAL TEST
            const length = module.plutus_list_get_length(fieldsListPtr);
            console.log(`[DEBUG]   -> Read list length: ${length}`);

            const items: PlutusData[] = [];
            for (let i = 0; i < length; i++) {
              const elementPtrPtr = module._malloc(4);
              let elementPtr = 0;
              try {
                assertSuccess(module.plutus_list_get(fieldsListPtr, i, elementPtrPtr));
                elementPtr = module.getValue(elementPtrPtr, 'i32');
                console.log(`[DEBUG]     -> Reading item ${i} at elementPtr: ${elementPtr}`);
                items.push(readPlutusData(elementPtr)); // Recursive call
              } finally {
                if (elementPtr) unrefObject(elementPtr);
                module._free(elementPtrPtr);
              }
            }
            const fields = { items };
            console.log(`[DEBUG]   -> Successfully read ${items.length} items. Returning.`);
            return { constructor, fields };
          } finally {
            module._free(alternativePtr);
            module._free(fieldsListPtrPtr);
          }
        } finally {
          if (constrPtr) unrefObject(constrPtr);
          if (fieldsListPtr) unrefObject(fieldsListPtr);
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

  try {
    // Case 1: bigint
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
    }
    // Case 2: Uint8Array (Bytes)
    else if (data instanceof Uint8Array) {
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
    }
    // Case 3-5: Object types
    else if (typeof data === 'object' && data !== null) {
      // Case 3: ConstrPlutusData
      if ('constructor' in data && 'fields' in data) {
        const constr = data as ConstrPlutusData;
        let fieldsListPtr = 0;
        let constrPtr = 0;
        try {
          // FIX: Call the new helper to get the correct cardano_plutus_list_t pointer
          fieldsListPtr = writePlutusList(constr.fields);

          const constrPtrPtr = module._malloc(4);
          try {
            const constrParts = splitToLowHigh64bit(constr.constructor);
            assertSuccess(
              module.constr_plutus_data_new(constrParts.low, constrParts.high, fieldsListPtr, constrPtrPtr)
            );
            constrPtr = module.getValue(constrPtrPtr, 'i32');
          } finally {
            module._free(constrPtrPtr);
          }

          const plutusDataPtrPtr = module._malloc(4);
          try {
            assertSuccess(module.plutus_data_new_constr(constrPtr, plutusDataPtrPtr));
            plutusDataPtr = module.getValue(plutusDataPtrPtr, 'i32');
          } finally {
            module._free(plutusDataPtrPtr);
          }
        } finally {
          if (fieldsListPtr) unrefObject(fieldsListPtr);
          if (constrPtr) unrefObject(constrPtr);
        }
      }
      // Case 4: PlutusMap
      else if ('entries' in data) {
        const map = data as PlutusMap;
        let mapPtr = 0;
        try {
          const mapPtrPtr = module._malloc(4);
          try {
            assertSuccess(module.plutus_map_new(mapPtrPtr));
            mapPtr = module.getValue(mapPtrPtr, 'i32');
          } finally {
            module._free(mapPtrPtr);
          }
          for (const pair of map.entries) {
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
          const plutusDataPtrPtr = module._malloc(4);
          try {
            assertSuccess(module.plutus_data_new_map(mapPtr, plutusDataPtrPtr));
            plutusDataPtr = module.getValue(plutusDataPtrPtr, 'i32');
          } finally {
            module._free(plutusDataPtrPtr);
          }
        } finally {
          if (mapPtr) unrefObject(mapPtr);
        }
      }
      // Case 5: PlutusList
      else if ('items' in data) {
        let listPtr = 0;
        try {
          // FIX: Call the new helper to create the list
          listPtr = writePlutusList(data as PlutusList);

          // Now, wrap the list in a generic PlutusData object
          const plutusDataPtrPtr = module._malloc(4);
          try {
            assertSuccess(module.plutus_data_new_list(listPtr, plutusDataPtrPtr));
            plutusDataPtr = module.getValue(plutusDataPtrPtr, 'i32');
          } finally {
            module._free(plutusDataPtrPtr);
          }
        } finally {
          if (listPtr) unrefObject(listPtr);
        }
      } else {
        throw new Error('Could not determine PlutusData object type');
      }
    } else {
      throw new Error('Could not determine PlutusData type for marshalling');
    }

    const finalPtr = plutusDataPtr;
    plutusDataPtr = 0; // Transfer ownership to the caller
    return finalPtr;

  } catch (error) {
    if (plutusDataPtr !== 0) unrefObject(plutusDataPtr);
    console.error('Failed to write PlutusData:', error);
    throw error;
  }
};