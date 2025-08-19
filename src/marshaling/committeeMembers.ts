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

import { CommitteeMembers, CredentialSet } from '../common';
import { assertSuccess, unrefObject } from './object';
import { getModule } from '../module';
import { readCredential, writeCredential } from './credential';
import { splitToLowHigh64bit } from './number';

/* DEFINITIONS ****************************************************************/

/**
 * @hidden
 * Deserializes a native C `cardano_credential_set_t` into a JavaScript `CredentialSet` array.
 *
 * @param {number} setPtr - A pointer to the native `cardano_credential_set_t` object.
 * @returns {CredentialSet} The deserialized JavaScript array of `Credential` objects.
 */
export const readCredentialSet = (setPtr: number): CredentialSet => {
  const module = getModule();
  const result: CredentialSet = [];
  const length = module.credential_set_get_length(setPtr);

  for (let i = 0; i < length; i++) {
    const credPtrPtr = module._malloc(4);
    let credPtr = 0;

    try {
      assertSuccess(module.credential_set_get(setPtr, i, credPtrPtr), `Failed to get credential at index ${i}`);
      credPtr = module.getValue(credPtrPtr, 'i32');
      result.push(readCredential(credPtr));
    } finally {
      if (credPtr) unrefObject(credPtr);
      module._free(credPtrPtr);
    }
  }

  return result;
};

/**
 * @hidden
 * Serializes a JavaScript `CredentialSet` array into a native C `cardano_credential_set_t`.
 *
 * @param {CredentialSet} credentials - The array of `Credential` objects to serialize.
 * @returns {number} A pointer to the newly created native `cardano_credential_set_t` object.
 */
export const writeCredentialSet = (credentials: CredentialSet): number => {
  const module = getModule();
  const setPtrPtr = module._malloc(4);
  let setPtr = 0;

  try {
    assertSuccess(module.credential_set_new(setPtrPtr), 'Failed to create credential set');
    setPtr = module.getValue(setPtrPtr, 'i32');

    for (const credential of credentials) {
      const credPtr = writeCredential(credential);
      try {
        assertSuccess(module.credential_set_add(setPtr, credPtr), 'Failed to add credential to set');
      } finally {
        unrefObject(credPtr);
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
 * Deserializes a native C `cardano_committee_members_map_t` into a JavaScript `CommitteeMembers` array.
 *
 * @param {number} mapPtr - A pointer to the native `cardano_committee_members_map_t` object.
 * @returns {CommitteeMembers} The deserialized JavaScript array of `CommitteeMember` objects.
 */
export const readCommitteeMembersMap = (mapPtr: number): CommitteeMembers => {
  const module = getModule();
  const result: CommitteeMembers = [];
  const length = module.committee_members_map_get_length(mapPtr);

  for (let i = 0; i < length; i++) {
    const credPtrPtr = module._malloc(4);
    const epochPtr = module._malloc(8);
    let credPtr = 0;

    try {
      assertSuccess(
        module.committee_members_map_get_key_value_at(mapPtr, i, credPtrPtr, epochPtr),
        `Failed to get committee member at index ${i}`
      );

      credPtr = module.getValue(credPtrPtr, 'i32');
      const low = module.getValue(epochPtr, 'i32') >>> 0;
      const high = module.getValue(epochPtr + 4, 'i32');
      const epoch = (BigInt(high) << 32n) | BigInt(low);

      result.push({
        coldCredential: readCredential(credPtr),
        epoch
      });
    } finally {
      if (credPtr) unrefObject(credPtr);
      module._free(credPtrPtr);
      module._free(epochPtr);
    }
  }

  return result;
};

/**
 * @hidden
 * Serializes a JavaScript `CommitteeMembers` array into a native C `cardano_committee_members_map_t`.
 *
 * @param {CommitteeMembers} members - The array of `CommitteeMember` objects to serialize.
 * @returns {number} A pointer to the newly created native `cardano_committee_members_map_t` object.
 */
export const writeCommitteeMembersMap = (members: CommitteeMembers): number => {
  const module = getModule();
  const mapPtrPtr = module._malloc(4);
  let mapPtr = 0;

  try {
    assertSuccess(module.committee_members_map_new(mapPtrPtr), 'Failed to create committee members map');
    mapPtr = module.getValue(mapPtrPtr, 'i32');

    for (const member of members) {
      const credPtr = writeCredential(member.coldCredential);
      const epochParts = splitToLowHigh64bit(member.epoch);
      try {
        assertSuccess(
          module.committee_members_map_insert(mapPtr, credPtr, epochParts.low, epochParts.high),
          'Failed to insert committee member into map'
        );
      } finally {
        unrefObject(credPtr);
      }
    }

    return mapPtr;
  } catch (error) {
    if (mapPtr) unrefObject(mapPtr);
    throw error;
  } finally {
    module._free(mapPtrPtr);
  }
};
