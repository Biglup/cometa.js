/* eslint-disable no-use-before-define */
/* eslint-disable unicorn/number-literal-case */
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

/* IMPORTS ******************************************************************/

import { CborReader, CborWriter } from '../encoding';
import { assertSuccess, readPlutusData, unrefObject, writePlutusData } from '../marshaling';
import { getModule } from '../module';

/* DEFINITIONS **************************************************************/

/**
 * Represents a Plutus list data structure.
 * It contains a list of PlutusData items.
 */
export type PlutusList = {
  /** This may be set when deserializing a datum. Useful for round-trip reserialization. */
  cbor?: string;
  items: PlutusData[];
};

/**
 * Represents a Plutus map data structure.
 * It contains an array of key-value pairs, where both keys and values are PlutusData.
 */
export type PlutusMap = {
  /** This may be set when deserializing a datum. Useful for round-trip reserialization. */
  cbor?: string;
  entries: Array<{ key: PlutusData; value: PlutusData }>;
};

/**
 * Represents a Plutus data structure with a constructor and fields.
 * The constructor is a bigint, and fields are represented as a PlutusList.
 */
export type ConstrPlutusData = {
  /** This may be set when deserializing a datum. Useful for round-trip reserialization. */
  cbor?: string;
  constructor: bigint;
  fields: PlutusList;
};

/**
 * Represents the various types of Plutus data.
 */
export type PlutusData = bigint | Uint8Array | PlutusList | PlutusMap | ConstrPlutusData;

/**
 * Checks if the given PlutusData has a CBOR cache.
 * @param data The PlutusData object to check.
 */
export const isPlutusDataWithCborCache = (data: PlutusData): data is PlutusList | PlutusMap | ConstrPlutusData =>
  typeof data === 'object' && data !== null && 'cbor' in data && typeof (data as any).cbor === 'string';

/**
 * Checks if the given PlutusData is a byte array.
 * @param data The PlutusData object to check.
 */
export const isPlutusDataByteArray = (data: PlutusData): data is Uint8Array =>
  typeof data === 'object' && data !== null && data instanceof Uint8Array;

/**
 * Checks if the given PlutusData is a bigint.
 * @param data The PlutusData object to check.
 */
export const isPlutusDataBigInt = (data: PlutusData): data is bigint => typeof data === 'bigint';

/**
 * Checks if the given PlutusData is a list.
 * @param data The PlutusData object to check.
 */
export const isPlutusDataList = (data: PlutusData): data is PlutusList =>
  typeof data === 'object' && data !== null && 'items' in data && Array.isArray((data as PlutusList).items);

/**
 * Checks if the given PlutusData is a map.
 * @param data The PlutusData object to check.
 */
export const isPlutusDataMap = (data: PlutusData): data is PlutusMap =>
  typeof data === 'object' && data !== null && 'entries' in data && Array.isArray((data as PlutusMap).entries);

/**
 * Checks if the given PlutusData is a constructor data.
 * @param data The PlutusData object to check.
 */
export const isPlutusDataConstr = (data: PlutusData): data is ConstrPlutusData =>
  typeof data === 'object' &&
  data !== null &&
  'constructor' in data &&
  'fields' in data &&
  isPlutusDataList((data as ConstrPlutusData).fields);

/**
 * Performs a deep equality check on two PlutusData.
 *
 * @param a The first PlutusData object.
 * @param b The second PlutusData object.
 * @returns True if the objects are deeply equal, false otherwise.
 */
export const deepEqualsPlutusData = (a: PlutusData, b: PlutusData): boolean => {
  const module = getModule();
  let ptrA = 0;
  let ptrB = 0;

  try {
    ptrA = writePlutusData(a);
    ptrB = writePlutusData(b);

    return module.plutus_data_equals(ptrA, ptrB);
  } finally {
    if (ptrA) {
      unrefObject(ptrA);
    }
    if (ptrB) {
      unrefObject(ptrB);
    }
  }
};

/**
 * Serializes a PlutusData object into its CBOR hexadecimal string representation.
 *
 * @param data The PlutusData object to serialize.
 * @returns A hex-encoded CBOR string.
 */
export const plutusDataToCbor = (data: PlutusData): string => {
  if (isPlutusDataWithCborCache(data) && data.cbor) {
    return data.cbor;
  }

  const module = getModule();
  let dataPtr = 0;

  const cborWriter = new CborWriter();
  try {
    dataPtr = writePlutusData(data);

    assertSuccess(module.plutus_data_to_cbor(dataPtr, cborWriter.ptr), 'Failed to serialize PlutusData to CBOR');

    return cborWriter.encodeHex();
  } finally {
    if (dataPtr) {
      unrefObject(dataPtr);
    }
  }
};

/**
 * Deserializes a CBOR hexadecimal string into a PlutusData object.
 *
 * @param cborHex The hex-encoded CBOR string to deserialize.
 * @returns The deserialized PlutusData object.
 */
export const cborToPlutusData = (cborHex: string): PlutusData => {
  const module = getModule();
  const cborReader = CborReader.fromHex(cborHex);

  let dataPtr = 0;
  try {
    const dataPtrPtr = module._malloc(4);
    const result = module.plutus_data_from_cbor(cborReader.ptr, dataPtrPtr);
    assertSuccess(result, 'Failed to deserialize CBOR to PlutusData');

    dataPtr = module.getValue(dataPtrPtr, 'i32');
    module._free(dataPtrPtr);

    const plutusData = readPlutusData(dataPtr);
    if (isPlutusDataWithCborCache(plutusData)) {
      plutusData.cbor = cborHex;
    }

    return plutusData;
  } finally {
    unrefObject(dataPtr);
  }
};
