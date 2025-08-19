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

import { Redeemer, RedeemerPurpose } from '../common';
import { getModule } from '../module';
import { readExUnits, writeExUnits } from './exUnits';
import { readPlutusData, writePlutusData } from './plutusData';
import { readTransactionFromCbor } from './transaction';
import { splitToLowHigh64bit } from './number';
import { unrefObject } from './object';

/* DEFINITIONS ****************************************************************/

/**
 * @hidden
 * Maps a RedeemerPurpose to a corresponding tag number.
 * @param purpose The RedeemerPurpose to map.
 */
const _mapPurposeToTag = (purpose: RedeemerPurpose): number => {
  switch (purpose) {
    case RedeemerPurpose.spend:
      return 0;
    case RedeemerPurpose.mint:
      return 1;
    case RedeemerPurpose.certificate:
      return 2;
    case RedeemerPurpose.withdrawal:
      return 3;
    case RedeemerPurpose.vote:
      return 4;
    case RedeemerPurpose.propose:
      return 5;
    default:
      throw new Error(`Unsupported redeemer purpose: ${purpose}`);
  }
};

/**
 * @hidden
 * Maps a tag number to a RedeemerPurpose.
 * @param tag The tag number to map.
 */
const _mapTagToPurpose = (tag: number): RedeemerPurpose => {
  switch (tag) {
    case 0:
      return RedeemerPurpose.spend;
    case 1:
      return RedeemerPurpose.mint;
    case 2:
      return RedeemerPurpose.certificate;
    case 3:
      return RedeemerPurpose.withdrawal;
    case 4:
      return RedeemerPurpose.vote;
    case 5:
      return RedeemerPurpose.propose;
    default:
      throw new Error(`Unsupported redeemer tag: ${tag}`);
  }
};

/**
 * @hidden
 * Reads a pointer to a C `cardano_redeemer_t` and converts it into a
 * JavaScript Redeemer object.
 *
 * @param {number} ptr A pointer to the C `cardano_redeemer_t` object.
 * @returns {Redeemer} The JavaScript representation of the Redeemer.
 */
export const readRedeemer = (ptr: number): Redeemer => {
  if (!ptr) {
    throw new Error('Pointer to Redeemer is null');
  }
  const module = getModule();
  let dataPtr = 0;
  let exUnitsPtr = 0;

  try {
    dataPtr = module.redeemer_get_data(ptr);
    exUnitsPtr = module.redeemer_get_ex_units(ptr);

    const tag = module.redeemer_get_tag(ptr);
    const index = module.redeemer_get_index(ptr);
    const data = readPlutusData(dataPtr);
    const executionUnits = readExUnits(exUnitsPtr);

    return {
      data,
      executionUnits,
      index: Number(index),
      purpose: _mapTagToPurpose(tag)
    };
  } finally {
    if (dataPtr !== 0) unrefObject(dataPtr);
    if (exUnitsPtr !== 0) unrefObject(exUnitsPtr);
  }
};

/**
 * @hidden
 * Converts a JavaScript Redeemer object into a C `cardano_redeemer_t` object in
 * WASM memory and returns a pointer to it.
 *
 * @param {Redeemer} redeemer The JavaScript Redeemer object.
 * @returns {number} A pointer to the C object. The caller is responsible for freeing this object.
 */
export const writeRedeemer = (redeemer: Redeemer): number => {
  const module = getModule();
  let dataPtr = 0;
  let exUnitsPtr = 0;
  let redeemerPtr = 0;
  let redeemerPtrPtr = 0;

  try {
    dataPtr = writePlutusData(redeemer.data);
    exUnitsPtr = writeExUnits(redeemer.executionUnits);

    redeemerPtrPtr = module._malloc(4);
    const indexParts = splitToLowHigh64bit(BigInt(redeemer.index));
    const result = module.redeemer_new(
      _mapPurposeToTag(redeemer.purpose),
      indexParts.low,
      indexParts.high,
      dataPtr,
      exUnitsPtr,
      redeemerPtrPtr
    );

    if (result !== 0) {
      throw new Error(`Failed to create Redeemer, error code: ${result}`);
    }

    redeemerPtr = module.getValue(redeemerPtrPtr, 'i32');
    module._free(redeemerPtrPtr);
    redeemerPtrPtr = 0;

    const finalPtr = redeemerPtr;
    redeemerPtr = 0;
    return finalPtr;
  } catch (error) {
    if (redeemerPtr !== 0) unrefObject(redeemerPtr);
    throw error;
  } finally {
    if (dataPtr !== 0) unrefObject(dataPtr);
    if (exUnitsPtr !== 0) unrefObject(exUnitsPtr);
    if (redeemerPtrPtr !== 0) module._free(redeemerPtrPtr);
  }
};

/**
 * @hidden
 * Converts a JavaScript array of Redeemer objects into a C `cardano_redeemer_list_t`
 * and returns its pointer.
 *
 * @param {Redeemer[]} redeemers The JavaScript array of Redeemer objects.
 * @returns {number} A pointer to the C `cardano_redeemer_list_t`.
 */
export const writeRedeemerList = (redeemers: Redeemer[]): number => {
  const module = getModule();
  let listPtr = 0;
  let listPtrPtr = 0;

  try {
    listPtrPtr = module._malloc(4);
    const result = module.redeemer_list_new(listPtrPtr);
    if (result !== 0) {
      throw new Error(`Failed to create Redeemer list, error code: ${result}`);
    }
    listPtr = module.getValue(listPtrPtr, 'i32');
    module._free(listPtrPtr);
    listPtrPtr = 0;

    for (const redeemer of redeemers) {
      let redeemerPtr = 0;
      try {
        redeemerPtr = writeRedeemer(redeemer);
        module.redeemer_list_add(listPtr, redeemerPtr);
      } finally {
        if (redeemerPtr !== 0) unrefObject(redeemerPtr);
      }
    }

    const finalListPtr = listPtr;
    listPtr = 0;
    return finalListPtr;
  } catch (error) {
    if (listPtr !== 0) unrefObject(listPtr);
    throw error;
  } finally {
    if (listPtrPtr !== 0) module._free(listPtrPtr);
  }
};

/**
 * @hidden
 * Reads a pointer to a C `cardano_redeemer_list_t` and converts it into a
 * JavaScript array of Redeemer objects.
 *
 * @param {number} ptr A pointer to the C `cardano_redeemer_list_t` object.
 * @returns {Redeemer[]} The JavaScript representation of the Redeemer list.
 */
export const readRedeemerList = (ptr: number): Redeemer[] => {
  if (ptr === 0) return [];

  const module = getModule();
  const jsArray: Redeemer[] = [];
  const len = module.redeemer_list_get_length(ptr);

  for (let i = 0; i < len; i++) {
    let redeemerPtr = 0;
    let redeemerPtrPtr = 0;

    try {
      redeemerPtrPtr = module._malloc(4);
      const result = module.redeemer_list_get(ptr, i, redeemerPtrPtr);
      if (result !== 0) {
        throw new Error(`Failed to get Redeemer at index ${i}, error code: ${result}`);
      }
      redeemerPtr = module.getValue(redeemerPtrPtr, 'i32');
      module._free(redeemerPtrPtr);
      redeemerPtrPtr = 0;

      jsArray.push(readRedeemer(redeemerPtr));
    } finally {
      if (redeemerPtr !== 0) unrefObject(redeemerPtr);
      if (redeemerPtrPtr !== 0) module._free(redeemerPtrPtr);
    }
  }

  return jsArray;
};

/**
 * @hidden
 * Parses a transaction CBOR hex string and returns its list of redeemers.
 * This function handles the temporary WASM objects and their memory.
 * @param {string} txCborHex The transaction CBOR as a hex string.
 * @returns {Redeemer[]} An array of the original redeemers from the transaction.
 */
export const readRedeemersFromTx = (txCborHex: string): Redeemer[] => {
  const module = getModule();
  let txPtr = 0;
  let witnessSetPtr = 0;
  let redeemerListPtr = 0;

  try {
    txPtr = readTransactionFromCbor(txCborHex);
    if (txPtr === 0) {
      throw new Error('Failed to parse transaction CBOR.');
    }

    witnessSetPtr = module.transaction_get_witness_set(txPtr);
    if (witnessSetPtr === 0) {
      return [];
    }

    redeemerListPtr = module.witness_set_get_redeemers(witnessSetPtr);
    if (redeemerListPtr === 0) {
      return [];
    }
    return readRedeemerList(redeemerListPtr);
  } finally {
    if (txPtr !== 0) unrefObject(txPtr);
    if (witnessSetPtr !== 0) unrefObject(witnessSetPtr);
    if (redeemerListPtr !== 0) unrefObject(redeemerListPtr);
  }
};
