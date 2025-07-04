/* eslint-disable no-use-before-define */
/* eslint-disable unicorn/number-literal-case */

import { CborReader, CborWriter } from '../encoding';
import { assertSuccess, readPlutusData, unrefObject, writePlutusData } from '../marshaling';
import { getModule } from '../module';

export type PlutusList = {
  /** This may be set when deserializing a datum. Useful for round-trip reserialization. */
  cbor?: string;
  items: PlutusData[];
};

export type PlutusMap = {
  /** This may be set when deserializing a datum. Useful for round-trip reserialization. */
  cbor?: string;
  entries: Array<{ key: PlutusData; value: PlutusData }>;
};

export type ConstrPlutusData = {
  /** This may be set when deserializing a datum. Useful for round-trip reserialization. */
  cbor?: string;
  constructor: bigint;
  fields: PlutusList;
};

export type PlutusData = bigint | Uint8Array | PlutusList | PlutusMap | ConstrPlutusData;

export const isPlutusDataWithCborCache = (data: PlutusData): data is PlutusList | PlutusMap | ConstrPlutusData =>
  typeof data === 'object' && data !== null && 'cbor' in data && typeof (data as any).cbor === 'string';

export const isPlutusDataByteArray = (data: PlutusData): data is Uint8Array =>
  typeof data === 'object' && data !== null && data instanceof Uint8Array;

export const isPlutusDataBigInt = (data: PlutusData): data is bigint => typeof data === 'bigint';

export const isPlutusDataList = (data: PlutusData): data is PlutusList =>
  typeof data === 'object' && data !== null && 'items' in data && Array.isArray((data as PlutusList).items);

export const isPlutusDataMap = (data: PlutusData): data is PlutusMap =>
  typeof data === 'object' && data !== null && 'entries' in data && Array.isArray((data as PlutusMap).entries);

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
    cborReader.unref();
    unrefObject(dataPtr);
  }
};
