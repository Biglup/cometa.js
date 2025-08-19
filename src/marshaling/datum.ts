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

import { Datum, DatumType } from '../common';
import { assertSuccess, unrefObject } from './object';
import { blake2bHashFromHex, readBlake2bHashData } from './blake2b';
import { getModule } from '../module';
import { readPlutusData, writePlutusData } from './plutusData';
import { uint8ArrayToHex } from '../cometa';

/* DEFINITIONS ****************************************************************/

/**
 * @hidden
 * Reads a Datum object from WASM memory and converts it into a JavaScript object.
 *
 * This function inspects the type of the native Datum object. If it's a `DataHash`,
 * it reads the Blake2b hash. If it's `InlineData`, it reads the full PlutusData structure.
 *
 * @param {number} datumPtr - A pointer to the Datum object in WASM memory.
 * @returns {Datum} A JavaScript object representing the datum, containing either a `datumHash` or an `inlineDatum` property.
 * @throws {Error} Throws an error if reading the datum or its constituent parts fails.
 */
export const readDatum = (datumPtr: number): Datum => {
  const module = getModule();
  let typePtr = 0;
  let hashPtr = 0;
  let dataPtr = 0;

  try {
    typePtr = module._malloc(4);
    module.datum_get_type(datumPtr, typePtr);
    const datumType = module.getValue(typePtr, 'i32');

    if (datumType === DatumType.DataHash) {
      hashPtr = module.datum_get_data_hash(datumPtr);
      const datumHash = uint8ArrayToHex(readBlake2bHashData(hashPtr));
      return { datumHash, type: DatumType.DataHash };
    }

    dataPtr = module.datum_get_inline_data(datumPtr);
    const inlineDatum = readPlutusData(dataPtr);

    return { inlineDatum, type: DatumType.InlineData };
  } finally {
    if (typePtr !== 0) module._free(typePtr);
    if (dataPtr !== 0) unrefObject(dataPtr);
  }
};

/**
 * @hidden
 * Creates a Datum object in WASM memory from a JavaScript Datum object.
 *
 * The function creates either an inline datum (from a PlutusData object) or a
 * datum hash (from a Blake2b hash) based on the properties of the input object.
 * It properly handles the creation and memory management of all underlying objects.
 *
 * @param {Datum} datum - The JavaScript object representing the datum. It should contain either an `inlineDatum` or a `datumHash` property.
 * @returns {number} A pointer to the created Datum object in WASM memory, or 0 if the input datum is empty.
 * @throws {Error} Throws an error if the creation of the native Datum object fails.
 */
export const writeDatum = (datum: Datum): number => {
  if (!datum.inlineDatum && !datum.datumHash) {
    return 0;
  }

  const module = getModule();
  let dataPtr = 0;
  let hashPtr = 0;
  let datumPtr = 0;
  let datumPtrPtr = 0;

  try {
    datumPtrPtr = module._malloc(4);

    if (datum.inlineDatum) {
      dataPtr = writePlutusData(datum.inlineDatum);
      const result = module.datum_new_inline_data(dataPtr, datumPtrPtr);
      assertSuccess(result, 'Failed to create inline datum');
    } else if (datum.datumHash) {
      hashPtr = blake2bHashFromHex(datum.datumHash);
      const result = module.datum_new_data_hash(hashPtr, datumPtrPtr);
      assertSuccess(result, 'Failed to create datum hash');
    }

    datumPtr = module.getValue(datumPtrPtr, 'i32');

    // Transfer ownership to the caller
    const finalPtr = datumPtr;
    datumPtr = 0;
    return finalPtr;
  } catch (error) {
    if (datumPtr !== 0) unrefObject(datumPtr);
    throw error;
  } finally {
    if (dataPtr !== 0) unrefObject(dataPtr);
    if (hashPtr !== 0) unrefObject(hashPtr);
    // Always free the temporary out-parameter buffer.
    if (datumPtrPtr !== 0) module._free(datumPtrPtr);
  }
};
