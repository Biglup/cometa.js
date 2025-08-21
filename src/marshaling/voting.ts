/**
 * Copyright 2025 Biglup Labs.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
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

import { Anchor, GovernanceActionId, Voter, VotingProcedure } from '../common';
import { assertSuccess, unrefObject } from './object';
import { getModule } from '../module';
import { readAnchor, writeAnchor } from './anchor';
import { readCredential, writeCredential } from './credential';
import { splitToLowHigh64bit } from './number';
import { writeStringToMemory } from './string';

/* DEFINITIONS ****************************************************************/

/**
 * @hidden
 * Deserializes a native `cardano_voter_t` object into a JavaScript `Voter` object.
 *
 * @param {number} ptr - A pointer to the native `cardano_voter_t` object.
 * @returns {Voter} The deserialized `Voter` object.
 */
export const readVoter = (ptr: number): Voter => {
  const module = getModule();
  const typePtr = module._malloc(4);
  let credentialPtr = 0;

  try {
    const typeResult = module.voter_get_type(ptr, typePtr);
    assertSuccess(typeResult, 'Failed to get voter type');
    const type = module.getValue(typePtr, 'i32');

    credentialPtr = module.voter_get_credential(ptr);
    if (!credentialPtr) {
      throw new Error('Failed to get voter credential: pointer is null');
    }

    const credential = readCredential(credentialPtr);

    return { credential, type };
  } finally {
    module._free(typePtr);
    if (credentialPtr) {
      unrefObject(credentialPtr);
    }
  }
};

/**
 * @hidden
 * Serializes a JavaScript `Voter` object into a native `cardano_voter_t` object.
 *
 * @param {Voter} voter - The `Voter` object to serialize.
 * @returns {number} A pointer to the newly created native `cardano_voter_t` object.
 */
export const writeVoter = (voter: Voter): number => {
  const module = getModule();
  const voterPtrPtr = module._malloc(4);
  const credentialPtr = writeCredential(voter.credential);

  try {
    const result = module.voter_new(voter.type, credentialPtr, voterPtrPtr);
    assertSuccess(result, 'Failed to create new voter');

    return module.getValue(voterPtrPtr, 'i32');
  } finally {
    unrefObject(credentialPtr);
    module._free(voterPtrPtr);
  }
};

/**
 * @hidden
 * Deserializes a native `cardano_governance_action_id_t` object into a JavaScript `GovernanceActionId` object.
 *
 * @param {number} ptr - A pointer to the native `cardano_governance_action_id_t` object.
 * @returns {GovernanceActionId} The deserialized `GovernanceActionId` object.
 */
export const readGovernanceActionId = (ptr: number): GovernanceActionId => {
  if (!ptr) {
    throw new Error('Pointer is null');
  }

  const module = getModule();
  const indexPtr = module._malloc(8);

  try {
    const idCStringPtr = module.governance_action_id_get_hash_hex(ptr);
    const id = module.UTF8ToString(idCStringPtr);

    const indexResult = module.governance_action_id_get_index(ptr, indexPtr);
    assertSuccess(indexResult, 'Failed to get governance action index');

    const low = module.getValue(indexPtr, 'i32');
    const high = module.getValue(indexPtr + 4, 'i32');
    const actionIndex = Number((BigInt(high) << 32n) | BigInt(low >>> 0));

    return { actionIndex, id };
  } finally {
    module._free(indexPtr);
  }
};

/**
 * @hidden
 * Serializes a JavaScript `GovernanceActionId` object or Bech32 string into a
 * native `cardano_governance_action_id_t` object pointer.
 *
 * @param {GovernanceActionId | string} govActionId - The `GovernanceActionId` object or Bech32 string to serialize.
 * @returns {number} A pointer to the newly created native `cardano_governance_action_id_t` object.
 */
export const writeGovernanceActionId = (govActionId: GovernanceActionId | string): number => {
  const module = getModule();

  if (typeof govActionId === 'string') {
    const bech32Ptr = writeStringToMemory(govActionId);
    const govActionIdPtrPtr = module._malloc(4);

    try {
      assertSuccess(
        module.governance_action_id_from_bech32(bech32Ptr, govActionId.length, govActionIdPtrPtr),
        'Failed to create governance action id from bech32'
      );
      return module.getValue(govActionIdPtrPtr, 'i32');
    } finally {
      module._free(bech32Ptr);
      module._free(govActionIdPtrPtr);
    }
  } else {
    if (typeof govActionId.id !== 'string' || typeof govActionId.actionIndex !== 'number') {
      throw new TypeError('Invalid GovernanceActionId object: must have id (string) and actionIndex (number).');
    }

    const idPtr = writeStringToMemory(govActionId.id);
    const govActionIdPtrPtr = module._malloc(4);

    try {
      const { low, high } = splitToLowHigh64bit(BigInt(govActionId.actionIndex));

      const result = module.governance_action_id_from_hash_hex(
        idPtr,
        govActionId.id.length,
        low,
        high,
        govActionIdPtrPtr
      );
      assertSuccess(result, 'Failed to create governance action id from hex hash');

      return module.getValue(govActionIdPtrPtr, 'i32');
    } finally {
      module._free(idPtr);
      module._free(govActionIdPtrPtr);
    }
  }
};

/**
 * @hidden
 * Deserializes a native `cardano_voting_procedure_t` object into a JavaScript `VotingProcedure` object.
 *
 * @param {number} ptr - A pointer to the native `cardano_voting_procedure_t` object.
 * @returns {VotingProcedure} The deserialized `VotingProcedure` object.
 */
export const readVotingProcedure = (ptr: number): VotingProcedure => {
  if (!ptr) {
    throw new Error('Pointer is null');
  }

  const module = getModule();
  const vote = module.voting_procedure_get_vote(ptr);
  const anchorPtr = module.voting_procedure_get_anchor(ptr);
  let anchor: Anchor | null = null;

  if (anchorPtr) {
    try {
      anchor = readAnchor(anchorPtr);
    } finally {
      unrefObject(anchorPtr);
    }
  }

  return { anchor, vote };
};

/**
 * @hidden
 * Serializes a JavaScript `VotingProcedure` object into a native `cardano_voting_procedure_t` object.
 *
 * @param {VotingProcedure} votingProcedure - The `VotingProcedure` object to serialize.
 * @returns {number} A pointer to the newly created native `cardano_voting_procedure_t` object.
 */
export const writeVotingProcedure = (votingProcedure: VotingProcedure): number => {
  const module = getModule();
  const votingProcedurePtrPtr = module._malloc(4);
  let anchorPtr = 0;

  if (votingProcedure.anchor) {
    anchorPtr = writeAnchor(votingProcedure.anchor);
  }

  try {
    const result = module.voting_procedure_new(votingProcedure.vote, anchorPtr, votingProcedurePtrPtr);
    assertSuccess(result, 'Failed to create new voting procedure');

    return module.getValue(votingProcedurePtrPtr, 'i32');
  } finally {
    if (anchorPtr) {
      unrefObject(anchorPtr);
    }
    module._free(votingProcedurePtrPtr);
  }
};
